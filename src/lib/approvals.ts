import { supabase } from "@/integrations/supabase/client";
import { logDocumentActivity } from "./documents";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// Types
export interface Approval {
  id: string;
  document_id: string;
  approver_id: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  approved_at?: string;
  order_sequence: number;
}

// Get pending approvals for a user
export const getPendingApprovals = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('document_approvals')
      .select(`
        *,
        documents(
          id,
          title,
          description,
          file_path,
          file_type,
          status,
          created_at,
          metadata,
          document_type_id,
          document_types(name)
        ),
        profiles!document_approvals_approver_id_fkey(name, email)
      `)
      .eq('approver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching pending approvals:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Exception in getPendingApprovals:", error);
    return [];
  }
};

// Get all approvals for a document
export const getDocumentApprovals = async (documentId: string) => {
  try {
    const { data, error } = await supabase
      .from('document_approvals')
      .select(`
        *,
        profiles!document_approvals_approver_id_fkey(id, name, email)
      `)
      .eq('document_id', documentId)
      .order('order_sequence', { ascending: true });
    
    if (error) {
      console.error("Error fetching document approvals:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Exception in getDocumentApprovals:", error);
    return [];
  }
};

// Approve a document
export const approveDocument = async (approvalId: string, userId: string, documentId: string) => {
  try {
    // 1. Update the approval record
    const { data: approvalData, error: approvalError } = await supabase
      .from('document_approvals')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', approvalId)
      .select()
      .single();
    
    if (approvalError) {
      console.error("Error approving document:", approvalError);
      throw approvalError;
    }
    
    // 2. Check if all approvals are complete
    const { data: approvals, error: approvalsError } = await supabase
      .from('document_approvals')
      .select('status')
      .eq('document_id', documentId);
    
    if (approvalsError) {
      console.error("Error checking approvals status:", approvalsError);
      throw approvalsError;
    }
    
    const allApproved = approvals.every(approval => approval.status === 'approved');
    
    // 3. If all approvals are complete, update document status
    if (allApproved) {
      const { error: documentError } = await supabase
        .from('documents')
        .update({ status: 'approved' })
        .eq('id', documentId);
      
      if (documentError) {
        console.error("Error updating document status:", documentError);
        throw documentError;
      }
      
      // 4. Apply watermark/stamp to the document
      await applyApprovalWatermark(documentId);
    }
    
    // 5. Log activity
    await logDocumentActivity(documentId, userId, 'approved', {
      approvalId,
      allApproved
    });
    
    return approvalData;
  } catch (error) {
    console.error("Exception in approveDocument:", error);
    throw error;
  }
};

// Reject a document
export const rejectDocument = async (approvalId: string, userId: string, documentId: string, comments: string) => {
  try {
    // 1. Update the approval record
    const { data: approvalData, error: approvalError } = await supabase
      .from('document_approvals')
      .update({
        status: 'rejected',
        comments,
        approved_at: new Date().toISOString()
      })
      .eq('id', approvalId)
      .select()
      .single();
    
    if (approvalError) {
      console.error("Error rejecting document:", approvalError);
      throw approvalError;
    }
    
    // 2. Update document status
    const { error: documentError } = await supabase
      .from('documents')
      .update({ status: 'rejected' })
      .eq('id', documentId);
    
    if (documentError) {
      console.error("Error updating document status:", documentError);
      throw documentError;
    }
    
    // 3. Log activity
    await logDocumentActivity(documentId, userId, 'rejected', {
      approvalId,
      comments
    });
    
    return approvalData;
  } catch (error) {
    console.error("Exception in rejectDocument:", error);
    throw error;
  }
};

// Apply watermark to approved document
export const applyApprovalWatermark = async (documentId: string) => {
  try {
    // 1. Get document details
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('file_path, title')
      .eq('id', documentId)
      .single();
    
    if (documentError || !document) {
      console.error("Error fetching document for watermarking:", documentError);
      return false;
    }
    
    // 2. Download the file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.file_path);
    
    if (downloadError || !fileData) {
      console.error("Error downloading file for watermarking:", downloadError);
      return false;
    }
    
    // 3. Only process PDF files
    if (!document.file_path.toLowerCase().endsWith('.pdf')) {
      console.log("Skipping watermark for non-PDF file");
      return false;
    }
    
    // 4. Load the PDF document
    const pdfDoc = await PDFDocument.load(await fileData.arrayBuffer());
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    
    // 5. Add watermark to the last page
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = lastPage.getSize();
    
    // Add approval stamp
    lastPage.drawRectangle({
      x: width - 200,
      y: 50,
      width: 180,
      height: 80,
      borderColor: rgb(0, 0.5, 0),
      borderWidth: 2,
      color: rgb(0.9, 1, 0.9),
      opacity: 0.8,
    });
    
    lastPage.drawText('APPROVED', {
      x: width - 190,
      y: 100,
      size: 24,
      font,
      color: rgb(0, 0.5, 0),
    });
    
    const approvalDate = new Date().toLocaleDateString();
    lastPage.drawText(`Date: ${approvalDate}`, {
      x: width - 190,
      y: 70,
      size: 12,
      font,
      color: rgb(0, 0.5, 0),
    });
    
    // 6. Save the modified PDF
    const modifiedPdfBytes = await pdfDoc.save();
    
    // 7. Upload the modified file
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .update(document.file_path, modifiedPdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });
    
    if (uploadError) {
      console.error("Error uploading watermarked file:", uploadError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Exception in applyApprovalWatermark:", error);
    return false;
  }
};
