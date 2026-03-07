import { DeathCertificateForm } from "@/components/DeathCertificateForm";
import { Header } from "@/components/Header";

export const HomePage = () => {
  return (
    <>
      <Header />
      <div className="mx-auto max-w-5xl">
        <DeathCertificateForm />
      </div>
    </>
  );
};
