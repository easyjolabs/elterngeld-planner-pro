import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export default function AdminImport() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const importBEEG = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      // Fetch the file from public folder
      const response = await fetch('/beeg-richtlinien.txt');
      if (!response.ok) {
        throw new Error('Failed to fetch file');
      }
      const text = await response.text();
      
      toast.info(`Fetched ${text.length} characters, sending to import function...`);

      // Send to edge function
      const { data, error } = await supabase.functions.invoke('import-text', {
        body: { 
          text,
          documentName: 'BEEG Richtlinien 2024/2025'
        }
      });

      if (error) throw error;

      setResult(data);
      toast.success(`Successfully imported ${data.chunkCount} chunks!`);
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
        <h1 className="text-2xl font-bold mb-4">BEEG Document Import</h1>
        <p className="text-muted-foreground mb-6">
          This will import the complete BEEG Richtlinien document (~21,000 lines) into the database for the chat to use.
        </p>
        
        <Button 
          onClick={importBEEG} 
          disabled={isLoading}
          size="lg"
          className="w-full"
        >
          {isLoading ? 'Importing...' : 'Import BEEG Richtlinien'}
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
