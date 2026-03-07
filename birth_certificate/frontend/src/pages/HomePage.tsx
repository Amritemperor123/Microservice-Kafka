import { BirthCertificateForm } from "@/components/BirthCertificateForm";
import { Header } from "@/components/Header";

export const HomePage = () => {
  return (
    <>
      <Header />
      <div className="mx-auto max-w-5xl">
        <BirthCertificateForm />
      </div>
    </>
  );
};
