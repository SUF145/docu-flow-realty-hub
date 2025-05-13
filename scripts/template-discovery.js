/**
 * Template Discovery Script
 * 
 * This script searches for and downloads real estate document templates from trusted sources,
 * then uploads them to Supabase Storage and creates entries in the templates table.
 * 
 * Usage:
 * node template-discovery.js
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Create temp directory for downloaded files
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Template sources - trusted websites with real estate templates
const templateSources = [
  {
    name: 'India Legal Forms',
    url: 'https://www.indialegalforms.com/real-estate-forms/',
    selector: '.document-list a',
    baseUrl: 'https://www.indialegalforms.com'
  },
  {
    name: 'LawRato',
    url: 'https://lawrato.com/legal-documents/real-estate',
    selector: '.document-card a',
    baseUrl: 'https://lawrato.com'
  }
];

// Template types to look for
const templateTypes = [
  'Sale Deed',
  'Allotment Letter',
  'Possession Letter',
  'Construction Agreement',
  'Rental Agreement',
  'Payment Receipt',
  'Lease Agreement',
  'Property Transfer',
  'NOC',
  'Power of Attorney'
];

// Function to check if a template bucket exists, create if not
async function ensureTemplateBucketExists() {
  try {
    console.log('Checking if templates bucket exists...');
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error listing buckets:', error);
      return false;
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === 'templates');
    
    if (!bucketExists) {
      console.log('Creating templates bucket...');
      const { error: createError } = await supabase.storage.createBucket('templates', {
        public: true
      });
      
      if (createError) {
        console.error('Error creating templates bucket:', createError);
        return false;
      }
      
      console.log('Templates bucket created successfully');
    } else {
      console.log('Templates bucket already exists');
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring template bucket exists:', error);
    return false;
  }
}

// Function to scrape templates from a source
async function scrapeTemplates(source) {
  try {
    console.log(`Scraping templates from ${source.name}...`);
    const response = await axios.get(source.url);
    const $ = cheerio.load(response.data);
    
    const templates = [];
    
    $(source.selector).each((i, element) => {
      const title = $(element).text().trim();
      const href = $(element).attr('href');
      const url = href.startsWith('http') ? href : `${source.baseUrl}${href}`;
      
      // Check if the template matches any of our desired types
      const matchesType = templateTypes.some(type => 
        title.toLowerCase().includes(type.toLowerCase())
      );
      
      if (matchesType) {
        templates.push({ title, url });
      }
    });
    
    console.log(`Found ${templates.length} matching templates from ${source.name}`);
    return templates;
  } catch (error) {
    console.error(`Error scraping templates from ${source.name}:`, error);
    return [];
  }
}

// Function to download a template file
async function downloadTemplate(template) {
  try {
    console.log(`Downloading template: ${template.title}...`);
    const response = await axios({
      method: 'GET',
      url: template.url,
      responseType: 'stream'
    });
    
    // Determine file extension from content-type
    const contentType = response.headers['content-type'];
    let extension = '.pdf';
    
    if (contentType.includes('pdf')) {
      extension = '.pdf';
    } else if (contentType.includes('word') || contentType.includes('docx')) {
      extension = '.docx';
    } else if (contentType.includes('msword')) {
      extension = '.doc';
    }
    
    // Create safe filename
    const safeTitle = template.title
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    
    const filename = `${safeTitle}${extension}`;
    const filepath = path.join(tempDir, filename);
    
    // Save file
    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve({ ...template, filepath, filename }));
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`Error downloading template: ${template.title}:`, error);
    return null;
  }
}

// Function to upload template to Supabase Storage
async function uploadTemplateToStorage(template) {
  try {
    console.log(`Uploading template to storage: ${template.filename}...`);
    
    const fileContent = fs.readFileSync(template.filepath);
    
    const { data, error } = await supabase.storage
      .from('templates')
      .upload(template.filename, fileContent, {
        contentType: template.filepath.endsWith('.pdf') 
          ? 'application/pdf' 
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true
      });
    
    if (error) {
      console.error(`Error uploading template to storage: ${template.filename}:`, error);
      return null;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('templates')
      .getPublicUrl(template.filename);
    
    return {
      ...template,
      file_template_url: urlData.publicUrl
    };
  } catch (error) {
    console.error(`Error uploading template to storage: ${template.filename}:`, error);
    return null;
  }
}

// Function to create template record in database
async function createTemplateRecord(template) {
  try {
    console.log(`Creating template record: ${template.title}...`);
    
    const { data, error } = await supabase
      .from('templates')
      .insert([
        {
          title: template.title,
          description: `${template.title} template from ${template.source}`,
          file_template_url: template.file_template_url,
          placeholders: {}
        }
      ])
      .select();
    
    if (error) {
      console.error(`Error creating template record: ${template.title}:`, error);
      return null;
    }
    
    console.log(`Template record created: ${template.title}`);
    return data[0];
  } catch (error) {
    console.error(`Error creating template record: ${template.title}:`, error);
    return null;
  }
}

// Main function
async function main() {
  try {
    // Ensure template bucket exists
    const bucketExists = await ensureTemplateBucketExists();
    if (!bucketExists) {
      console.error('Failed to ensure template bucket exists. Exiting...');
      return;
    }
    
    // Scrape templates from all sources
    let allTemplates = [];
    for (const source of templateSources) {
      const templates = await scrapeTemplates(source);
      allTemplates = allTemplates.concat(
        templates.map(template => ({ ...template, source: source.name }))
      );
    }
    
    console.log(`Found ${allTemplates.length} total templates`);
    
    // Download, upload, and create records for each template
    for (const template of allTemplates) {
      // Download template
      const downloadedTemplate = await downloadTemplate(template);
      if (!downloadedTemplate) continue;
      
      // Upload template to storage
      const uploadedTemplate = await uploadTemplateToStorage(downloadedTemplate);
      if (!uploadedTemplate) continue;
      
      // Create template record
      const templateRecord = await createTemplateRecord(uploadedTemplate);
      if (!templateRecord) continue;
      
      console.log(`Successfully processed template: ${template.title}`);
    }
    
    // Clean up temp directory
    fs.rmdirSync(tempDir, { recursive: true });
    
    console.log('Template discovery completed successfully');
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// Run the script
main();
