import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, Home, Key, Construction, Loader2 } from "lucide-react";
import { getIndustrySegments, IndustrySegment } from "@/lib/onboarding";

interface IndustrySegmentSelectorProps {
  onSelect: (segment: IndustrySegment) => void;
}

const IndustrySegmentSelector = ({ onSelect }: IndustrySegmentSelectorProps) => {
  const [segments, setSegments] = useState<IndustrySegment[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSegments = async () => {
      setIsLoading(true);
      try {
        const data = await getIndustrySegments();
        setSegments(data);
      } catch (error) {
        console.error("Error fetching industry segments:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSegments();
  }, []);

  const handleSelect = (segment: IndustrySegment) => {
    setSelectedSegment(segment.id);
    onSelect(segment);
  };

  const getIconForSegment = (iconName?: string) => {
    switch (iconName) {
      case 'home':
        return <Home className="h-8 w-8 mb-2" />;
      case 'building':
        return <Building className="h-8 w-8 mb-2" />;
      case 'key':
        return <Key className="h-8 w-8 mb-2" />;
      case 'construction':
        return <Construction className="h-8 w-8 mb-2" />;
      default:
        return <Building className="h-8 w-8 mb-2" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Select Your Industry Segment</h2>
        <p className="text-muted-foreground">
          Choose the real estate segment that best describes your business
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {segments.map((segment) => (
          <Card 
            key={segment.id}
            className={`cursor-pointer transition-all hover:border-primary ${
              selectedSegment === segment.id ? 'border-2 border-primary' : ''
            }`}
            onClick={() => handleSelect(segment)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                {getIconForSegment(segment.icon)}
                <span className="ml-2">{segment.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                {segment.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default IndustrySegmentSelector;
