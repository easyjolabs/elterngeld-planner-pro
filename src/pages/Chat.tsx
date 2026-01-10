import { useState } from "react";
import ElterngeldChat from "@/components/ElterngeldChat";

const Chat = () => {
  const [isChatOpen, setIsChatOpen] = useState(true);

  return (
    <ElterngeldChat
      isOpen={isChatOpen}
      onClose={() => setIsChatOpen(false)}
      language="en"
    />
  );
};

export default Chat;
