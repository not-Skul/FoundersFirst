import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, ArrowRight, User, Bot, Loader2, Edit2, Check, X } from "lucide-react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { RoadmapContainer } from "@/components/roadmap/RoadmapContainer";
import { SchemeComparisonPanel } from "@/components/scheme-comparison/SchemeComparisonPanel";
import { useSchemeComparison } from "@/contexts/SchemeComparisonContext";
import { RoadmapPhase, RoadmapStatus } from "@/types";


// ---------------------------------------------------------------------------
// API base URL — set VITE_API_URL in .env (dev) or .env.production (prod)
// ---------------------------------------------------------------------------
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface OldRoadmapPhase {
  phase: number;
  title: string;
  description: string;
  tasks: string[];
}

/**
 * Convert old format roadmap from API to new format
 */
function convertToNewRoadmapFormat(
  oldPhases: OldRoadmapPhase[],
  currentPhaseIndex: number = 0
): RoadmapPhase[] {
  return oldPhases.map((oldPhase, index) => ({
    phase: oldPhase.phase,
    title: oldPhase.title,
    description: oldPhase.description,
    status: (
      index < currentPhaseIndex
        ? "completed"
        : index === currentPhaseIndex
          ? "in_progress"
          : "not_started"
    ) as RoadmapStatus,
    estimatedDuration: "2-4 weeks",
    steps: oldPhase.tasks.map((task, taskIndex) => ({
      id: `step_${oldPhase.phase}_${taskIndex}`,
      title: task,
      description: `Step for ${oldPhase.title}`,
      status: "not_started" as RoadmapStatus,
      priority: taskIndex === 0 ? "high" : "medium",
      relatedSchemes: [],
      resources: [],
      isCompleted: false,
    })),
  }));
}

const AIBot = () => {
  const [step, setStep] = useState<"input" | "chat">("input");
  const [formData, setFormData] = useState({
    idea: "",
    age: "",
    gender: "",
    category: "",
    location: "",
    fundingStatus: "",
  });
  const [isHydrating, setIsHydrating] = useState(true);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapPhase[]>([]);
  const [roadmapContext, setRoadmapContext] = useState("");
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const [startupIdea, setStartupIdea] = useState("");
  const [isEditingIdea, setIsEditingIdea] = useState(false);
  const [editIdeaText, setEditIdeaText] = useState("");

  // Scheme comparison context
  const { selectedSchemes, isComparisonOpen, closeComparison } = useSchemeComparison();

  // Load saved progress from storage/db
  async function loadProgress(phases: RoadmapPhase[]) {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      const res = await axios.get(`${API_BASE}/roadmap/progress`, {
        headers: { Authorization: token },
      });
      if (res.data) {
        const loadedSteps = new Set<string>(res.data.completedSteps || []);
        const loadedIndex = res.data.currentPhaseIndex || 0;
        
        setCompletedSteps(loadedSteps);
        setCurrentPhaseIndex(loadedIndex);
        
        // Ensure roadmap phases match loaded progress accurately
        const updatedRoadmap = phases.map((phase, index) => ({
          ...phase,
          status: (
            index < loadedIndex ? "completed" : index === loadedIndex ? "in_progress" : "not_started"
          ) as RoadmapStatus,
          steps: phase.steps?.map((step) =>
            loadedSteps.has(step.id) ? { ...step, status: "completed" as RoadmapStatus, isCompleted: true } : step
          ),
        }));
        setRoadmap(updatedRoadmap);
      }
    } catch (err) {
      console.error("Error loading progress", err);
    }
  }

  // Load chat history from backend
  async function loadChatHistory() {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await axios.get(`${API_BASE}/chat/history`, {
        headers: { Authorization: token },
      });

      if (res.data.messages && res.data.messages.length > 0) {
        setMessages(res.data.messages);
        console.log(
          `[CHAT] Loaded ${res.data.messages.length} messages from history`
        );
      }
    } catch (err) {
      console.error("[HISTORY] Error loading chat history:", err);
      // Silently fail - user will just start with empty chat
    }
  }

  // Save progress to backend
  function saveProgress(updatedCompletedSteps?: Set<string>, updatedPhaseIndex?: number) {
    const stepsToSave = Array.from(updatedCompletedSteps || completedSteps);
    const phaseToSave = updatedPhaseIndex !== undefined ? updatedPhaseIndex : currentPhaseIndex;
    
    const token = localStorage.getItem("token");
    if (token) {
      axios.post(`${API_BASE}/roadmap/progress`, {
        completedSteps: stepsToSave,
        currentPhaseIndex: phaseToSave
      }, {
        headers: { Authorization: token }
      }).catch(console.error);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setIsHydrating(false);
      setStep("input");
      return;
    }

    axios
      .get(`${API_BASE}/my-roadmap`, {
        headers: { Authorization: token },
      })
      .then((res) => {
        if (res.data.roadmap && res.data.roadmap.length > 0) {
          setStartupIdea(res.data.startup_idea || "");
          setEditIdeaText(res.data.startup_idea || "");
          // Convert old format to new
          const newRoadmap = convertToNewRoadmapFormat(res.data.roadmap);
          setRoadmap(newRoadmap);
          setStep("chat");

          const summary = createSummary(newRoadmap);
          setRoadmapContext(summary);

          // Load saved progress
          loadProgress(newRoadmap);

          // Load previous chat history
          loadChatHistory();
        } else {
          setStep("input");
        }
      })
      .catch(() => setStep("input"))
      .finally(() => setIsHydrating(false));
  }, []);



const createSummary = (phases: RoadmapPhase[]) => {
  return phases
    .map((p) => `Phase ${p.phase}: ${p.title} - ${p.description}`)
    .join(". ");
};

const handleFormSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    // Save form
    await axios.post(`${API_BASE}/roadmap_genration_form`, {
      user_id: 1,
      startup_idea: formData.idea,
      age: Number(formData.age),
      gender: formData.gender,
      category: formData.category,
      location: formData.location,
      funding_status: formData.fundingStatus,
    });

    // Call AI roadmap
    const token = localStorage.getItem("token");

    const aiRes = await axios.post(
        `${API_BASE}/generate_roadmap`,
        {
          query: `I am ${formData.age} years old ${formData.gender}. 
          I want to build ${formData.idea}. 
          My category is ${formData.category}, 
          located in ${formData.location}. 
          Funding status: ${formData.fundingStatus}.`,
          startup_idea: formData.idea,
        },
        {
          headers: {
            Authorization: token,
          },
        }
      );

      // Convert old format to new
      const newRoadmap = convertToNewRoadmapFormat(aiRes.data.roadmap);
      setRoadmap(newRoadmap);
      setStartupIdea(formData.idea);
      setEditIdeaText(formData.idea);

      const summary = createSummary(newRoadmap);
      setRoadmapContext(summary);

      // Switch to chat
      setStep("chat");

      setMessages([
        {
          role: "assistant",
          content: `Your personalized roadmap is ready based on your idea: "${formData.idea}". You can track your progress, mark steps as complete, and explore recommended schemes for each phase.`,
        },
      ]);

      // Save progress
      saveProgress();

  } catch (error) {
    console.error(error);
    alert("AI roadmap generation failed");
  } finally {
    setIsLoading(false);
  }
};



  // Handle step completion
  const handleStepComplete = useCallback(
    (stepId: string) => {
      let newSet = new Set(completedSteps);
      setCompletedSteps((prev) => {
        newSet = new Set(prev);
        newSet.add(stepId);
        return newSet;
      });

      // Update roadmap status
      setRoadmap((prev) =>
        prev.map((phase) => ({
          ...phase,
          steps: phase.steps?.map((step) =>
            step.id === stepId ? { ...step, status: "completed" } : step
          ),
        }))
      );

      saveProgress(newSet, currentPhaseIndex);
    },
    [completedSteps, currentPhaseIndex]
  );

  const handleUpdateIdea = async () => {
    if (!editIdeaText.trim() || editIdeaText === startupIdea) {
      setIsEditingIdea(false);
      return;
    }
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `${API_BASE}/startup/idea`,
        { new_idea: editIdeaText },
        { headers: { Authorization: token } }
      );
      
      setStartupIdea(editIdeaText);
      setIsEditingIdea(false);
      
      if (res.data.roadmap) {
        setCompletedSteps(new Set());
        setCurrentPhaseIndex(0);
        const newRoadmap = convertToNewRoadmapFormat(res.data.roadmap, 0);
        setRoadmap(newRoadmap);
        const summary = createSummary(newRoadmap);
        setRoadmapContext(summary);
      }
      
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Your startup idea has been updated to "${editIdeaText}". I have regenerated your roadmap accordingly.`
      }]);
    } catch (err) {
      console.error(err);
      alert("Failed to update startup idea.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMsg = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    // Add user message AND empty assistant placeholder in a single state update
    // to avoid stale closure issues with index calculations
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMsg },
      { role: "assistant", content: "" },
    ]);

    try {
      const token = localStorage.getItem("token");

      // Create POST request to /chat/stream
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: token }),
        },
        body: JSON.stringify({
          message: userMsg,
          context: roadmapContext,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Parse JSON response
      const data = await response.json();
      const responseText = data.response || "";

      // Update the LAST assistant message in the array using functional update
      // This avoids the stale closure bug — we always operate on the latest state
      setMessages((prev) => {
        const updated = [...prev];
        // Find the last assistant message (the placeholder we just added)
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].role === "assistant" && updated[i].content === "") {
            updated[i] = {
              role: "assistant",
              content: responseText || "No response received.",
            };
            break;
          }
        }
        return updated;
      });
    } catch (err) {
      console.error("[Chat Error]", err);

      // Build a user-friendly error message based on error type
      let errorMessage = "Sorry, something went wrong. Please try again.";
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (msg.includes("taking too long") || msg.includes("timed out") || msg.includes("timeout")) {
          errorMessage = "⏳ The AI took too long to respond. This can happen with complex questions — try breaking it into smaller parts, or try again.";
        } else if (msg.includes("unavailable") || msg.includes("failed to fetch") || msg.includes("network")) {
          errorMessage = "🔌 Couldn't reach the AI service. Please check your connection and try again.";
        } else if (err.message && !msg.includes("http")) {
          // Use the backend error message if it's user-friendly (not a raw HTTP error)
          errorMessage = err.message;
        }
      }

      // Update the last empty assistant placeholder with the error message
      setMessages((prev) => {
        const updated = [...prev];
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].role === "assistant" && updated[i].content === "") {
            updated[i] = {
              role: "assistant",
              content: errorMessage,
            };
            break;
          }
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

if (isHydrating) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Loading your roadmap...</p>
    </div>
  );
}


  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-16">
        <div className="container mx-auto px-6 py-12">
          <AnimatePresence mode="wait">
            {step === "input" ? (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-2xl mx-auto"
              >
                <div className="text-center mb-12">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-6">
                    <Sparkles className="w-4 h-4" />
                    AI-Powered Guidance
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                    Tell Us About Your Startup
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    We'll create a personalized roadmap based on your profile and idea.
                  </p>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-6">
                  <div className="p-8 rounded-3xl bg-card border border-border shadow-card">
                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Your Startup Idea *
                        </label>
                        <textarea
                          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                          rows={4}
                          placeholder="Describe your startup idea in detail..."
                          value={formData.idea}
                          onChange={(e) => setFormData({ ...formData, idea: e.target.value })}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Age *</label>
                          <Input
                            type="number"
                            placeholder="25"
                            value={formData.age}
                            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                            required
                            className="rounded-xl h-12"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Gender *</label>
                          <select
                            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            required
                          >
                            <option value="">Select gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Category *</label>
                          <select
                            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            required
                          >
                            <option value="">Select category</option>
                            <option value="General">General</option>
                            <option value="SC">SC</option>
                            <option value="ST">ST</option>
                            <option value="OBC">OBC</option>
                            <option value="EWS">EWS</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Location (State) *</label>
                          <select
                            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            required
                          >
                            <option value="">Select state</option>
                            <option value="Maharashtra">Maharashtra</option>
                            <option value="Karnataka">Karnataka</option>
                            <option value="Delhi">Delhi</option>
                            <option value="Tamil Nadu">Tamil Nadu</option>
                            <option value="Gujarat">Gujarat</option>
                            <option value="Telangana">Telangana</option>
                            <option value="Uttar Pradesh">Uttar Pradesh</option>
                            <option value="Assam">Assam</option>
                            <option value="Andhra Pradesh">Andhra Pradesh</option>
                            <option value="Punjab">Punjab</option>
                            <option value="Bihar">Bihar</option>
                            <option value="West Bengal">West Bengal</option>
                            <option value="Kerala">Kerala</option>
                            <option value="Chhattisgarh">Chhattisgarh</option>
                            <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                            <option value="Jharkhand">Jharkhand</option>
                            <option value="Ladakh">Ladakh</option>
                            <option value="Madhya Pradesh">Madhya Pradesh</option>
                            <option value="Manipur">Manipur</option>
                            <option value="Others">Others</option>
                        
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Funding Status *</label>
                        <select
                          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          value={formData.fundingStatus}
                          onChange={(e) => setFormData({ ...formData, fundingStatus: e.target.value })}
                          required
                        >
                          <option value="">Select funding status</option>
                          <option value="Bootstrapped">Bootstrapped</option>
                          <option value="Pre-seed">Pre-seed</option>
                          <option value="Seed">Seed</option>
                          <option value="Series A+">Series A+</option>
                          <option value="Looking for funding">Looking for funding</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <Button type="submit" variant="hero" size="xl" className="w-full">
                    Generate My Roadmap
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-7xl mx-auto"
              >
                {/* Comparison Panel */}
                <SchemeComparisonPanel
                  scheme1={selectedSchemes[0]}
                  scheme2={selectedSchemes[1]}
                  isOpen={isComparisonOpen}
                  onClose={closeComparison}
                />

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                  {/* Chat Section */}
                  <div className="lg:col-span-2">
                    <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-card h-[600px] flex flex-col">
                      <div className="p-4 border-b border-border bg-surface-subtle">
                        <h2 className="font-semibold text-foreground flex items-center gap-2">
                          <Bot className="w-5 h-5 text-primary" />
                          AI Assistant
                        </h2>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                msg.role === "user" ? "bg-primary" : "bg-secondary"
                              }`}
                            >
                              {msg.role === "user" ? (
                                <User className="w-4 h-4 text-primary-foreground" />
                              ) : (
                                <Bot className="w-4 h-4 text-foreground" />
                              )}
                            </div>
                            <div
                              className={`px-4 py-3 rounded-2xl max-w-[80%] ${
                                msg.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary text-secondary-foreground"
                              }`}
                            >
                              {msg.role === "user" ? (
                                <p className="text-sm">{msg.content}</p>
                              ) : (
                                <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                                  <ReactMarkdown
                                    components={{
                                      p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                      ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2" {...props} />,
                                      ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2" {...props} />,
                                      li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                      strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                                      em: ({ node, ...props }) => <em className="italic" {...props} />,
                                      code: ({ node, className, children, ...props }: any) => 
                                        className ? 
                                          <pre className="bg-black/20 p-2 rounded text-xs overflow-x-auto mb-2"><code className={className} {...props}>{children}</code></pre> :
                                          <code className="bg-black/20 px-1.5 py-0.5 rounded text-xs" {...props}>{children}</code>,
                                      h1: ({ node, ...props }) => <h1 className="text-lg font-bold mb-2" {...props} />,
                                      h2: ({ node, ...props }) => <h2 className="text-base font-bold mb-2" {...props} />,
                                      h3: ({ node, ...props }) => <h3 className="text-sm font-bold mb-1" {...props} />,
                                    }}
                                  >
                                    {msg.content}
                                  </ReactMarkdown>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                        {isLoading && (
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                              <Loader2 className="w-4 h-4 text-foreground animate-spin" />
                            </div>
                            <div className="px-4 py-3 rounded-2xl bg-secondary">
                              <div className="flex gap-1">
                                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Input */}
                      <div className="p-4 border-t border-border">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Ask a follow-up question..."
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                            className="rounded-xl"
                          />
                          <Button
                            onClick={handleSendMessage}
                            disabled={isLoading || !inputMessage.trim()}
                            size="icon"
                            className="rounded-xl"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Roadmap Section - NEW COMPONENT */}
                  <div className="lg:col-span-3 flex flex-col gap-4">
                    {/* Editable Idea */}
                    <div className="bg-card border border-border rounded-3xl p-5 shadow-card">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <h3 className="font-semibold text-foreground">Your Startup Idea</h3>
                            {!isEditingIdea && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setIsEditingIdea(true)}
                                className="h-8 text-muted-foreground hover:text-foreground"
                              >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit
                              </Button>
                            )}
                          </div>
                          
                          {isEditingIdea ? (
                            <div className="space-y-3">
                              <textarea
                                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none min-h-[80px]"
                                value={editIdeaText}
                                onChange={(e) => setEditIdeaText(e.target.value)}
                              />
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => {
                                    setIsEditingIdea(false);
                                    setEditIdeaText(startupIdea);
                                  }}
                                  disabled={isLoading}
                                >
                                  <X className="w-4 h-4 mr-1" /> Cancel
                                </Button>
                                <Button 
                                  variant="hero" 
                                  size="sm" 
                                  onClick={handleUpdateIdea}
                                  disabled={isLoading || !editIdeaText.trim()}
                                >
                                  <Check className="w-4 h-4 mr-1" /> Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-sm leading-relaxed">
                              {startupIdea || "No startup idea saved. Click 'Edit' to add one and automatically regenerate your roadmap!"}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <RoadmapContainer
                      phases={roadmap}
                      isLoading={isLoading}
                      onStepComplete={handleStepComplete}
                      userPhase={currentPhaseIndex}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AIBot;
