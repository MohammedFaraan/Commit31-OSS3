import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { FaArrowLeft, FaPaperPlane, FaComments, FaCircle } from "react-icons/fa";
import toast from "react-hot-toast";
import api from "../api/client";
import useAuth from "../context/useAuth";
import { useSocket } from "../context/SocketContext";

export default function Messages() {
  const { user } = useAuth();
  const socket = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();

  // Conversations
  const [conversations, setConversations] = useState([]);
  const [convoLoading, setConvoLoading] = useState(true);

  // Active chat
  const [activeChat, setActiveChat] = useState(null); // { _id, name, email }
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [activeItemId, setActiveItemId] = useState(null);

  // Input
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // Mobile view state
  const [showChat, setShowChat] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const fontStyle = { fontFamily: "'Space Mono', monospace" };

  // ─── Fetch conversations ───
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const data = await api.get("/api/messages/conversations");
        setConversations(data);
      } catch (err) {
        console.error("Failed to fetch conversations:", err);
      } finally {
        setConvoLoading(false);
      }
    };
    fetchConversations();
  }, []);

  // ─── Handle query params (from UserProfile "Message" button) ───
  useEffect(() => {
    const userId = searchParams.get("user");
    const userName = searchParams.get("name");
    const userEmail = searchParams.get("email");

    if (userId && userName) {
      setActiveChat({
        _id: userId,
        name: decodeURIComponent(userName),
        email: userEmail ? decodeURIComponent(userEmail) : "",
      });
      setShowChat(true);
      setInput("");
      // Clear query params
      setSearchParams({}, { replace: true });
    }
  }, []); // Run once on mount

  // ─── Fetch messages when active chat changes ───
  useEffect(() => {
    if (!activeChat) return;
    let ignore = false;

    const fetchMessages = async () => {
      setMessages([]);
      setActiveItemId(null);
      setMsgLoading(true);
      try {
        const data = await api.get(`/api/messages/with/${activeChat._id}`);
        if (ignore) return;
        setMessages(data);

        const lastMsg = data[data.length - 1];
        setActiveItemId(lastMsg?.item?._id || lastMsg?.item || null);

        // Mark unread messages as read
        const unread = data.filter(
          (m) =>
            !m.read &&
            (m.receiver?._id === user?._id || m.receiver === user?._id)
        );
        for (const m of unread) {
          try {
            await api.patch(`/api/messages/${m._id}/read`);
          } catch {
            // silent
          }
        }

        if (ignore) return;
        // Update conversation list to clear unread indicator
        if (unread.length > 0) {
          setConversations((prev) =>
            prev.map((c) =>
              (c._id?._id || c._id) === activeChat._id
                ? { ...c, lastMessage: { ...c.lastMessage, read: true } }
                : c
            )
          );
        }
      } catch (err) {
        if (ignore) return;
        console.error("Failed to fetch messages:", err);
      } finally {
        if (!ignore) setMsgLoading(false);
      }
    };
    fetchMessages();
    return () => {
      ignore = true;
    };
  }, [activeChat, user?._id]);

  // ─── Auto-scroll to bottom ───
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Socket: listen for new messages ───
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      // Update conversations list
      setConversations((prev) => {
        const senderId = msg.sender?._id || msg.sender;
        const existing = prev.find(
          (c) => (c._id?._id || c._id) === senderId
        );

        if (existing) {
          // Move to top with updated last message
          const updated = prev.map((c) =>
            (c._id?._id || c._id) === senderId
              ? { ...c, lastMessage: msg }
              : c
          );
          updated.sort(
            (a, b) =>
              new Date(b.lastMessage.createdAt) -
              new Date(a.lastMessage.createdAt)
          );
          return updated;
        } else {
          // New conversation
          return [
            {
              _id: msg.sender,
              lastMessage: msg,
            },
            ...prev,
          ];
        }
      });

      // If this message is for the active chat, append it
      const senderId = msg.sender?._id || msg.sender;
      if (activeChat && senderId === activeChat._id) {
        setMessages((prev) => [...prev, msg]);
        setActiveItemId((prev) => prev || msg.item?._id || msg.item || null);
        // Mark as read immediately
        api.patch(`/api/messages/${msg._id}/read`).catch(() => { });
      }
    };

    socket.on("new_message", handleNewMessage);
    return () => socket.off("new_message", handleNewMessage);
  }, [socket, activeChat]);

  // ─── Select conversation ───
  const selectConversation = useCallback((partner) => {
    setActiveChat(partner);
    setShowChat(true);
    setInput("");
  }, []);

  // ─── Send message ───
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeChat || !activeItemId || sending) return;

    setSending(true);
    try {
      const data = await api.post("/api/messages", {
        receiver: activeChat._id,
        item: activeItemId,
        content: input.trim(),
      });
      setMessages((prev) => [...prev, data]);
      setInput("");
      inputRef.current?.focus();
      toast.success("Message sent");

      // Update conversation list
      setConversations((prev) => {
        const updated = prev.map((c) =>
          (c._id?._id || c._id) === activeChat._id
            ? { ...c, lastMessage: data }
            : c
        );
        updated.sort(
          (a, b) =>
            new Date(b.lastMessage.createdAt) -
            new Date(a.lastMessage.createdAt)
        );
        return updated;
      });
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // ─── Format time ───
  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: "short" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const formatMsgTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ─── Get partner info from conversation ───
  const getPartner = (convo) => {
    const partner = convo._id;
    return {
      _id: partner?._id || partner,
      name: partner?.name || partner?.email || "Unknown",
      email: partner?.email || "",
    };
  };

  // ─── Render ───
  return (
    <div className="min-h-[calc(100vh-64px)] mt-16 flex" style={fontStyle}>
      {/* ─── Conversation List ─── */}
      <div
        className={`w-full md:w-[360px] md:min-w-[360px] border-r-4 border-black bg-white flex flex-col ${showChat ? "hidden md:flex" : "flex"
          }`}
      >
        {/* Header */}
        <div className="border-b-4 border-black bg-yellow-300 p-4">
          <h1
            className="text-xl font-black uppercase flex items-center gap-2"
            style={fontStyle}
          >
            <FaComments /> Messages
          </h1>
        </div>

        {/* Conversation items */}
        <div className="flex-1 overflow-y-auto">
          {convoLoading ? (
            <div className="p-6 text-center">
              <p className="text-sm font-black uppercase animate-pulse" style={fontStyle}>
                Loading...
              </p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center">
              <div className="border-4 border-black p-6 bg-yellow-50 shadow-[4px_4px_0px_#000]">
                <FaComments size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-black uppercase" style={fontStyle}>
                  No conversations yet
                </p>
                <p className="text-xs mt-2 opacity-60" style={fontStyle}>
                  Start a conversation from an item page
                </p>
              </div>
            </div>
          ) : (
            conversations.map((convo) => {
              const partner = getPartner(convo);
              const isActive = activeChat?._id === partner._id;
              const lastMsg = convo.lastMessage;
              const isSender =
                (lastMsg?.sender?._id || lastMsg?.sender) === user?._id;
              const isUnread = !isSender && !lastMsg?.read;

              return (
                <button
                  key={partner._id}
                  onClick={() => selectConversation(partner)}
                  className={`w-full text-left px-4 py-3 border-b-2 border-black transition-colors cursor-pointer ${isActive
                    ? "bg-yellow-300"
                    : isUnread
                      ? "bg-yellow-50 hover:bg-yellow-100"
                      : "bg-white hover:bg-gray-50"
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm uppercase truncate ${isUnread ? "font-black" : "font-bold"
                            }`}
                        >
                          {partner.name}
                        </span>
                        {isUnread && (
                          <FaCircle size={8} className="text-green-500 shrink-0" />
                        )}
                      </div>
                      <p
                        className={`text-xs mt-1 truncate ${isUnread
                          ? "font-bold text-black"
                          : "font-normal opacity-60"
                          }`}
                      >
                        {isSender ? "You: " : ""}
                        {lastMsg?.content}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold opacity-50 shrink-0 mt-1">
                      {lastMsg?.createdAt && formatTime(lastMsg.createdAt)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ─── Chat Window ─── */}
      <div
        className={`flex-1 flex flex-col bg-gray-50 ${!showChat ? "hidden md:flex" : "flex"
          }`}
      >
        {!activeChat ? (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="border-4 border-black p-8 bg-white shadow-[6px_6px_0px_#000]">
                <FaComments size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-lg font-black uppercase" style={fontStyle}>
                  Select a conversation
                </p>
                <p className="text-xs mt-2 opacity-50" style={fontStyle}>
                  Choose a conversation from the list to start chatting
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="border-b-4 border-black bg-yellow-300 p-4 flex items-center gap-3">
              <button
                aria-label="Back to conversations"
                onClick={() => setShowChat(false)}
                className="md:hidden w-8 h-8 border-2 border-black bg-white flex items-center justify-center hover:bg-black hover:text-yellow-300 transition-colors cursor-pointer"
              >
                <FaArrowLeft size={14} />
              </button>
              <div className="flex-1 min-w-0">
                <h2
                  className="text-sm font-black uppercase truncate"
                  style={fontStyle}
                >
                  {activeChat.name}
                </h2>
                <p className="text-[10px] opacity-60 truncate" style={fontStyle}>
                  {activeChat.email}
                </p>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgLoading ? (
                <div className="flex items-center justify-center h-full">
                  <p
                    className="text-sm font-black uppercase animate-pulse"
                    style={fontStyle}
                  >
                    Loading messages...
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p
                    className="text-sm font-bold opacity-40"
                    style={fontStyle}
                  >
                    No messages yet. Say hello! 👋
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine =
                    (msg.sender?._id || msg.sender) === user?._id;
                  return (
                    <div
                      key={msg._id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] border-2 border-black p-3 ${isMine
                          ? "bg-yellow-300 shadow-[3px_3px_0px_#000]"
                          : "bg-white shadow-[3px_3px_0px_#000]"
                          }`}
                      >
                        <p className="text-sm break-words" style={fontStyle}>
                          {msg.content}
                        </p>
                        <div className="flex items-center justify-end gap-2 mt-1">
                          {msg.item?.name && (
                            <span className="text-[9px] font-bold opacity-40 truncate max-w-[100px]">
                              re: {msg.item.name}
                            </span>
                          )}
                          <span className="text-[10px] opacity-40">
                            {formatMsgTime(msg.createdAt)}
                          </span>
                          {isMine && (
                            <span className="text-[10px] opacity-40">
                              {msg.read ? "✓✓" : "✓"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t-4 border-black bg-white p-3">
              {!activeItemId ? (
                <div className="text-center py-3 space-y-2">
                  <p
                    className="text-xs font-black uppercase opacity-60"
                    style={fontStyle}
                  >
                    No item context — messages must be linked to a lost or found item
                  </p>
                  <a
                    href="#report"
                    className="inline-block text-xs font-black uppercase border-2 border-black px-4 py-2 bg-yellow-300 hover:bg-black hover:text-yellow-300 transition-colors shadow-[2px_2px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                    style={fontStyle}
                  >
                    Report a Lost or Found Item →
                  </a>
                </div>
              ) : (
                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 border-2 border-black p-3 text-sm font-bold outline-none focus:bg-yellow-50 transition-colors"
                    style={fontStyle}
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    aria-label="Send message"
                    disabled={!input.trim() || sending}
                    className="border-2 border-black bg-yellow-300 px-5 font-black uppercase hover:bg-black hover:text-yellow-300 transition-all shadow-[3px_3px_0px_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    style={fontStyle}
                  >
                    <FaPaperPlane size={16} />
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
