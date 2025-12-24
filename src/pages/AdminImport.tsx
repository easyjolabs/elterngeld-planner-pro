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
      toast.info('Fetching and processing BMFSFJ brochure... This may take a minute.');

      // Call the edge function to fetch and process the PDF
      const { data, error } = await supabase.functions.invoke('import-broschuere', {
        body: {}
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
