import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Target, Users, Lightbulb, Award, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const values = [
  {
    icon: Target,
    title: "Mission-Driven",
    description: "Empowering every aspiring entrepreneur in India with the tools and knowledge to succeed.",
  },
  {
    icon: Users,
    title: "Community First",
    description: "Building a supportive ecosystem where founders help founders grow and thrive.",
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    description: "Leveraging AI and technology to make entrepreneurship accessible to everyone.",
  },
  {
    icon: Award,
    title: "Excellence",
    description: "Committed to providing the highest quality guidance and resources.",
  },
];

const team = [
  {
    name: "Anurag singh bhagour",
    role: "Software engineer",
    bio: "Former startup founder with 10+ years in the Indian startup ecosystem.",
  },
  {
    name: "Saksham kulshrestha",
    role: "Software engineer",
    bio: "Ex-Google engineer passionate about building AI-powered solutions.",
  },
  {
    name: "Muskan agarwal",
    role: "Software engineer",
    bio: "Connected 500+ startups with government schemes and investors.",
  },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-16">
        {/* Hero */}
        <section className="py-20 bg-surface-subtle">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto text-center"
            >
              <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
                About FoundersFirst
              </h1>
              <p className="text-lg text-muted-foreground">
                We're on a mission to democratize entrepreneurship in India by making guidance, resources, and government support accessible to every aspiring founder.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Mission */}
        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <span className="text-primary font-semibold text-sm tracking-wide uppercase mb-4 block">
                  Our Story
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                  Built by Founders, for Founders
                </h2>
                <p className="text-muted-foreground mb-6">
                  FoundersFirst was born from our own struggles navigating the complex world of Indian entrepreneurship. We spent months understanding government schemes, compliance requirements, and funding options — time that could have been spent building our product.
                </p>
                <p className="text-muted-foreground mb-8">
                  We believe every Indian entrepreneur deserves access to the same quality guidance that well-connected founders in metro cities get. That's why we built FoundersFirst — an AI-powered platform that democratizes startup knowledge and connects founders with the right opportunities.
                </p>
                <Button variant="hero" asChild>
                  <Link to="/ai-bot" className="flex items-center gap-2">
                    Try Our AI Bot
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="grid grid-cols-2 gap-4"
              >
                {values.map((value, index) => (
                  <div
                    key={value.title}
                    className="p-6 rounded-2xl bg-card border border-border"
                  >
                    <value.icon className="w-8 h-8 text-primary mb-4" />
                    <h3 className="font-semibold text-foreground mb-2">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">{value.description}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-20 bg-surface-subtle">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Meet Our Team
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                A passionate team of entrepreneurs, technologists, and ecosystem builders.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {team.map((member, index) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center p-8 rounded-2xl bg-card border border-border"
                >
                  <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">
                      {member.name.charAt(0)}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground text-lg">{member.name}</h3>
                  <p className="text-primary text-sm font-medium mb-3">{member.role}</p>
                  <p className="text-muted-foreground text-sm">{member.bio}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-3xl mx-auto text-center"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Ready to Start Your Journey?
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Join thousands of entrepreneurs who are building their dreams with FoundersFirst.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="hero" size="lg" asChild>
                  <Link to="/ai-bot">Get Started</Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/schemes">Explore Schemes</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
