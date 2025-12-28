import { useState } from "react";
import { ElterngeldBeratung } from "@/components/ElterngeldBeratung";
import { Navbar } from "@/components/Navbar";
import { useNavigate } from "react-router-dom";

const Beratung = () => {
  const navigate = useNavigate();
  const [aiMessages, setAiMessages] = useState<{ role: string; content: string }[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const sendMessage = async (message: string) => {
    const userMessage = { role: "user", content: message };
    const updatedMessages = [...aiMessages, userMessage];
    setAiMessages(updatedMessages);
    setIsAiLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elterngeld-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: updatedMessages,
            context: {
              monthlyIncome: 2500,
              hasSiblingBonus: false,
              multipleChildren: 0,
              isEligible: true,
              basisAmount: 1625,
              plusAmount: 812.5,
              totalBasis: 22750,
              totalPlus: 19500,
            },
          }),
        }
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let content = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ") && !line.includes("[DONE]")) {
            try {
              const json = JSON.parse(line.slice(6));
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) content += delta;
            } catch {
              // Ignore parse errors for partial JSON
            }
          }
        }
      }

      setAiMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="h-dvh flex flex-col bg-[#F5F5F5]">
      <Navbar />
      <div className="flex-1 min-h-0 p-4 md:p-6 overflow-hidden">
        <div className="max-w-2xl mx-auto h-full">
          <ElterngeldBeratung
            onSendMessage={sendMessage}
            aiMessages={aiMessages}
            isAiLoading={isAiLoading}
            onBack={() => navigate("/")}
          />
        </div>
      </div>
    </div>
  );
};

export default Beratung;
