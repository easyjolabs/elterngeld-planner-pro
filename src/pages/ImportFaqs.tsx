import { useState } from "react";

const ImportFaqs = () => {
  const [status, setStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const importFaqs = async () => {
    setIsLoading(true);
    setStatus("Loading FAQ data...");

    try {
      // Load FAQ JSON from public folder
      const response = await fetch("/data/faqs.json");
      if (!response.ok) throw new Error("Failed to load FAQ file");
      
      const faqData = await response.json();
      setStatus(`Loaded ${faqData.faqs.length} FAQs. Importing...`);

      // Import via edge function
      const importResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-faqs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ faqs: faqData }),
        }
      );

      const result = await importResponse.json();
      
      if (importResponse.ok) {
        setStatus(`✅ Success! Imported ${result.success} FAQs. Failed: ${result.failed}`);
      } else {
        setStatus(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">FAQ Import Tool</h1>
      <p className="text-muted-foreground mb-4">
        Click the button below to import all FAQs from the JSON file into the database.
      </p>
      <button
        onClick={importFaqs}
        disabled={isLoading}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
      >
        {isLoading ? "Importing..." : "Import FAQs"}
      </button>
      {status && (
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <pre className="text-sm whitespace-pre-wrap">{status}</pre>
        </div>
      )}
    </div>
  );
};

export default ImportFaqs;
