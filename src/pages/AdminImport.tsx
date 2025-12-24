import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export default function AdminImport() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const importBroschuere = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      toast.info('Fetching PDF from local file...');

      // Fetch the PDF from the public folder
      const response = await fetch('/elterngeld-broschuere.pdf');
      if (!response.ok) {
        throw new Error('Failed to fetch PDF file');
      }

      const arrayBuffer = await response.arrayBuffer();

      // Convert to base64 via FileReader (more memory-friendly than manual loops)
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read PDF file'));
        reader.onload = () => {
          const result = reader.result;
          if (typeof result !== 'string') return reject(new Error('Invalid FileReader result'));
          const commaIndex = result.indexOf(',');
          if (commaIndex < 0) return reject(new Error('Invalid data URL'));
          resolve(result.slice(commaIndex + 1));
        };
        reader.readAsDataURL(blob);
      });

      toast.info('Uploading PDF for processing...');

      // Call the backend function with the PDF data
      const { data, error } = await supabase.functions.invoke('import-broschuere', {
        body: { pdfBase64 },
      });

      if (error) throw error;

      setResult(data);
      toast.success(`Successfully imported ${data.chunkCount} chunks from the brochure!`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <Card className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Elterngeld Broschüre Import</h1>
        <p className="text-muted-foreground mb-6">
          This will import the official BMFSFJ "Elterngeld und Elternzeit" brochure into the database. 
          The brochure contains user-friendly explanations and examples.
        </p>
        
        <Button 
          onClick={importBroschuere} 
          disabled={isLoading}
          size="lg"
          className="w-full"
        >
          {isLoading ? 'Importing... (takes ~1 min)' : 'Import BMFSFJ Broschüre'}
        </Button>

        {result && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Import Result</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </Card>
    </div>
  );
}
