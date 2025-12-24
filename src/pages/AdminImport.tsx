import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function AdminImport() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // Chunked import state
  const [chunksJson, setChunksJson] = useState('');
  const [documentName, setDocumentName] = useState('Elterngeld-Broschüre BMFSFJ 2024');
  const [isChunkLoading, setIsChunkLoading] = useState(false);
  const [chunkResult, setChunkResult] = useState<any>(null);

  const importBroschuere = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      toast.info('Fetching PDF from local file...');

      const response = await fetch('/elterngeld-broschuere.pdf');
      if (!response.ok) {
        throw new Error('Failed to fetch PDF file');
      }

      const arrayBuffer = await response.arrayBuffer();

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

  const importChunks = async () => {
    if (!chunksJson.trim()) {
      toast.error('Please paste the JSON array of chunks');
      return;
    }

    setIsChunkLoading(true);
    setChunkResult(null);

    try {
      let chunks: string[];
      
      try {
        chunks = JSON.parse(chunksJson);
      } catch {
        toast.error('Invalid JSON format. Please paste a valid JSON array.');
        setIsChunkLoading(false);
        return;
      }

      if (!Array.isArray(chunks)) {
        toast.error('JSON must be an array of strings');
        setIsChunkLoading(false);
        return;
      }

      toast.info(`Importing ${chunks.length} chunks...`);

      const { data, error } = await supabase.functions.invoke('import-chunks', {
        body: { 
          chunks, 
          documentName: documentName.trim() || 'Imported Document',
          clearExisting: true 
        },
      });

      if (error) throw error;

      setChunkResult(data);
      setChunksJson('');
      toast.success(`Successfully imported ${data.chunksImported} chunks!`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setIsChunkLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Pre-chunked JSON Import */}
        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-2">Import Pre-Chunked JSON</h1>
          <p className="text-muted-foreground mb-6">
            Paste a JSON array of pre-chunked German text. This will replace all existing chunks.
          </p>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="documentName">Document Name</Label>
              <Input
                id="documentName"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="e.g. Elterngeld-Broschüre BMFSFJ 2024"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="chunksJson">JSON Array of Chunks</Label>
              <Textarea
                id="chunksJson"
                value={chunksJson}
                onChange={(e) => setChunksJson(e.target.value)}
                placeholder='["Chunk 1 text...", "Chunk 2 text...", ...]'
                className="mt-1 font-mono text-sm min-h-[200px]"
              />
            </div>
            
            <Button 
              onClick={importChunks} 
              disabled={isChunkLoading || !chunksJson.trim()}
              size="lg"
              className="w-full"
            >
              {isChunkLoading ? 'Importing...' : 'Import Chunks'}
            </Button>
          </div>

          {chunkResult && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Import Result</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(chunkResult, null, 2)}
              </pre>
            </div>
          )}
        </Card>

        <Separator />

        {/* Legacy PDF Import */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-2">Legacy: PDF Import</h2>
          <p className="text-muted-foreground mb-6">
            Import from the original PDF file (not recommended - use pre-chunked JSON above).
          </p>
          
          <Button 
            onClick={importBroschuere} 
            disabled={isLoading}
            variant="outline"
            size="lg"
            className="w-full"
          >
            {isLoading ? 'Importing... (takes ~1 min)' : 'Import BMFSFJ Broschüre (PDF)'}
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
    </div>
  );
}
