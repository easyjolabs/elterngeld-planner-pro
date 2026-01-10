import { useState } from "react";
import ElterngeldChat from "@/components/ElterngeldChat";

const Beratung = () => {
  const [isChatOpen, setIsChatOpen] = useState(true);

  return (
    <ElterngeldChat
      isOpen={isChatOpen}
      onClose={() => setIsChatOpen(false)}
      language="en"
    />
  );
};

export default Beratung;
