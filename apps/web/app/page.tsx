import Header from '../components/landing/Header';
import Hero from '../components/landing/Hero';
import Surfaces from '../components/landing/Surfaces';
import HowItWorks from '../components/landing/HowItWorks';
import Features from '../components/landing/Features';
import LogoMarquee from '../components/landing/LogoMarquee';
import CTA from '../components/landing/CTA';
import Footer from '../components/landing/Footer';

export default function Home() {
  return (
    <>
      <Header />
      <main id="main-content">
        <Hero />
        <Surfaces />
        <HowItWorks />
        <Features />
        <LogoMarquee />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
