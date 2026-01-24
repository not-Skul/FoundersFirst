import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, ArrowRight, User, Bot, Loader2 } from "lucide-react";
import axios from "axios";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface RoadmapPhase {
  phase: number;
  title: string;
  description: string;
  tasks: string[];
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapPhase[]>([]);
  const [roadmapContext, setRoadmapContext] = useState("");

const createSummary = (roadmap: RoadmapPhase[]) => {
  return roadmap.map(p => `Phase ${p.phase}: ${p.title}`).join(". ");
};

const handleFormSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    // Save form
    await axios.post("http://localhost:5000/roadmap_genration_form", {
      user_id: 1,
      startup_idea: formData.idea,
      age: Number(formData.age),
      gender: formData.gender,
      category: formData.category,
      location: formData.location,
      funding_status: formData.fundingStatus,
    });

    // Call AI roadmap
    const aiRes = await axios.post("http://localhost:5000/generate_roadmap", {
      query: `I am ${formData.age} years old ${formData.gender}. 
      I want to build ${formData.idea}. 
      My category is ${formData.category}, 
      located in ${formData.location}. 
      Funding status: ${formData.fundingStatus}.`
    });

    // Set roadmap from AI
    setRoadmap(aiRes.data.roadmap);

    const summary = createSummary(aiRes.data.roadmap);
setRoadmapContext(summary);

    //Switch to chat
    setStep("chat");

    setMessages([
      {
        role: "assistant",
        content: `Your personalized roadmap is ready based on your idea: "${formData.idea}".`,
      },
    ]);

  } catch (error) {
    console.error(error);
    alert("AI roadmap generation failed");
  } finally {
    setIsLoading(false);
  }
};



  const handleSendMessage = async () => {
  if (!inputMessage.trim()) return;

  const userMsg = inputMessage;

  setMessages(prev => [...prev, { role: "user", content: userMsg }]);
  setInputMessage("");
  setIsLoading(true);

  try {
    const res = await axios.post("http://localhost:5000/chat_with_roadmap", {
      message: userMsg,
      context: roadmapContext
    });

    const aiText = res.data.response || "Sorry, I could not generate a reply.";

    setMessages(prev => [
      ...prev,
      { role: "assistant", content: aiText }
    ]);

  } catch (err) {
    setMessages(prev => [
      ...prev,
      { role: "assistant", content: "AI is not responding right now." }
    ]);
  } finally {
    setIsLoading(false);
  }
};

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
                            <option value="Other">Other</option>
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
                className="max-w-5xl mx-auto"
              >
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
                              <p className="text-sm">{msg.content}</p>
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

                  {/* Roadmap Section */}
                  <div className="lg:col-span-3">
                    <h2 className="text-2xl font-bold text-foreground mb-6">Your Personalized Roadmap</h2>
                    <div className="space-y-4">
                      {roadmap.map((phase, index) => (
                        <motion.div
                          key={phase.phase}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-6 rounded-2xl bg-card border border-border shadow-soft hover:shadow-card transition-shadow"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center flex-shrink-0">
                              {phase.phase}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground text-lg mb-1">{phase.title}</h3>
                              <p className="text-muted-foreground text-sm mb-4">{phase.description}</p>
                              <ul className="space-y-2">
                                {phase.tasks.map((task, taskIndex) => (
                                  <li key={taskIndex} className="flex items-start gap-2 text-sm text-foreground">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                                    {task}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
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
