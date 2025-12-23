import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Upload, FileText, CheckCircle2 } from 'lucide-react';

export default function Admin() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; chunkCount?: number; textLength?: number } | null>(null);

  const processDocument = async () => {
    setIsProcessing(true);
    setResult(null);
    
    try {
      // Fetch the text file from public folder
      const response = await fetch('/beeg-richtlinien.txt');
      if (!response.ok) {
        throw new Error('Konnte die Textdatei nicht laden');
      }
      
      const text = await response.text();
      console.log(`Loaded text file: ${text.length} characters`);
      
      // Call the import-text edge function
      const importResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          text,
          documentName: 'BEEG Richtlinien 06/2025',
        }),
      });
      
      if (!importResponse.ok) {
        const error = await importResponse.json();
        throw new Error(error.error || 'Import fehlgeschlagen');
      }
      
      const data = await importResponse.json();
      setResult(data);
      toast.success(`Dokument erfolgreich importiert: ${data.chunkCount} Abschnitte`);
    } catch (error) {
      console.error('Error processing document:', error);
      toast.error(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin: Dokumentenverwaltung</h1>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              BEEG Richtlinien importieren
            </CardTitle>
            <CardDescription>
              Importiert die BEEG Richtlinien (beeg-richtlinien.txt) in die Datenbank für die RAG-Suche.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={processDocument} 
              disabled={isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verarbeite Dokument...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Dokument importieren
                </>
              )}
            </Button>
            
            {result?.success && (
              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Import erfolgreich!</span>
                </div>
                <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                  <p>Textlänge: {result.textLength?.toLocaleString()} Zeichen</p>
                  <p>Abschnitte: {result.chunkCount}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <p className="text-sm text-muted-foreground mt-4 text-center">
          Nach dem Import kann der Chat Fragen basierend auf dem Dokument beantworten.
        </p>
      </div>
    </div>
  );
}
