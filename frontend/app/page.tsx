import Navbar from "./components/Navbar/Navbar";
import Hero from "./components/Hero/Hero";
import HowItWorks from "./components/HowItWorks/HowItWorks";
import Footer from "@/app/components/Footer";
import TeamSection from "@/app/components/TeamSection";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <HowItWorks />
      <TeamSection />
      <Footer />
    </>
  );
}