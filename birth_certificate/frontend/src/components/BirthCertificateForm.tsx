import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BirthCertificateForm as BirthCertificateFormType } from "@/types/birth-certificate";
import { AadhaarConsentDialog } from "./AadhaarConsentDialog";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, ShieldCheck } from "lucide-react";

export const BirthCertificateForm = () => {
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionState, setSubmissionState] = useState<{
    id: number;
    status: string;
    pdfReady: boolean;
  } | null>(null);
  const { toast } = useToast();

  const form = useForm<BirthCertificateFormType>({
    mode: 'onChange',
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      dateOfBirth: "",
      gender: 'male',
      timeOfBirth: "",
      placeOfBirth: "",
      fatherName: "",
      fatherAadhaarNumber: "",
      motherName: "",
      motherAadhaarNumber: "",
      issuingAuthority: "",
      registrationNumber: "",
      aadhaarConsentGiven: false,
    },
  });

  const onSubmit = async (data: BirthCertificateFormType) => {
    if (!data.aadhaarConsentGiven) {
      setShowConsentDialog(true);
      return;
    }
    await handleFormSubmission(data);
  };

  const handleConsentGiven = async () => {
    setShowConsentDialog(false);
    form.setValue('aadhaarConsentGiven', true);
    const data = form.getValues();
    await handleFormSubmission(data);
  };

  const handleFormSubmission = async (data: BirthCertificateFormType) => {
    setIsSubmitting(true);
    try {
      // Build multipart form data for backend
      const payload = {
        firstName: data.firstName,
        middleName: data.middleName || undefined,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        timeOfBirth: data.timeOfBirth || undefined,
        placeOfBirth: data.placeOfBirth,
        fatherName: data.fatherName,
        fatherAadhaarNumber: data.fatherAadhaarNumber,
        motherName: data.motherName,
        motherAadhaarNumber: data.motherAadhaarNumber,
        issuingAuthority: data.issuingAuthority || undefined,
        registrationNumber: data.registrationNumber || undefined,
        aadhaarConsentGiven: data.aadhaarConsentGiven,
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL}/submit-form`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ formData: payload }),
      });

      if (!res.ok) throw new Error("Failed to submit application");

      const result = await res.json();

      toast({
        title: "Application Submitted",
        description: "Birth certificate request submitted. PDF generation is in progress.",
      });

      setSubmissionState({
        id: result.submissionId,
        status: result.status ?? "pending",
        pdfReady: result.status === "pdf_ready",
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: "Failed to submit birth certificate application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formValues = form.watch();
  const isValid = form.formState.isValid;
  const successRef = useRef<HTMLDivElement | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);

  useEffect(() => {
    if (submissionState && successRef.current) {
      successRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      requestAnimationFrame(() => setSuccessVisible(true));
    } else {
      setSuccessVisible(false);
    }
  }, [submissionState]);

  useEffect(() => {
    if (!submissionState || submissionState.pdfReady) {
      return;
    }

    const intervalId = window.setInterval(async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/submission/${submissionState.id}`);
        if (!response.ok) {
          return;
        }

        const result = await response.json();
        const nextStatus = result.status ?? "pending";
        const pdfReady = nextStatus === "pdf_ready";

        setSubmissionState((current) => current && current.id === submissionState.id
          ? { ...current, status: nextStatus, pdfReady }
          : current);

        if (pdfReady) {
          toast({
            title: "PDF Ready",
            description: `Submission #${submissionState.id} is ready to view or download.`,
          });
          window.clearInterval(intervalId);
        }
      } catch (error) {
        console.error("Error polling submission status:", error);
      }
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [submissionState, toast]);

  return (
    <>
      <Card className="w-full mx-auto shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                Birth Certificate Application
              </CardTitle>
              <CardDescription>Provide accurate details to generate an official-looking certificate</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Aarav" {...field} />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">As on official records</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="middleName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Middle Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Optional" {...field} />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">Leave blank if not applicable</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Sharma" {...field} />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">Surname</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Birth *</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">Format: YYYY-MM-DD</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gender *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Select as per birth record</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="timeOfBirth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time of Birth</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">24-hour format</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="placeOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Place of Birth *</FormLabel>
                          <FormControl>
                            <Input placeholder="City, State" {...field} />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">Include district/state if relevant</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Father's Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Father's Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="fatherName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Father's Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="fatherAadhaarNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Father's AADHAAR Number *</FormLabel>
                            <FormControl>
                              <Input placeholder="12-digit number" {...field} maxLength={12} onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "");
                                form.setValue("fatherAadhaarNumber", value);
                              }} />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">Digits only, no spaces or dashes</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Mother's Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Mother's Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="motherName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mother's Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="motherAadhaarNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mother's AADHAAR Number *</FormLabel>
                            <FormControl>
                              <Input placeholder="12-digit number" {...field} maxLength={12} onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "");
                                form.setValue("motherAadhaarNumber", value);
                              }} />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">Digits only, no spaces or dashes</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Official Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Official Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="issuingAuthority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Issuing Authority</FormLabel>
                            <FormControl>
                              <Input placeholder="Municipal authority / Registrar" {...field} />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">If known</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="registrationNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Registration Number</FormLabel>
                            <FormControl>
                              <Input placeholder="If available" {...field} />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">Optional</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Button type="submit" size="lg" className="w-full" disabled={!isValid || isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit Application"}
                  </Button>
                </form>
              </Form>
            </div>
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="text-base">Application Summary</CardTitle>
                  <CardDescription>Review before submitting</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">Applicant</div>
                      <div className="font-medium">
                        {formValues.firstName || "—"} {formValues.middleName || ""} {formValues.lastName || "—"}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-muted-foreground">DOB</div>
                        <div className="font-medium">{formValues.dateOfBirth || "—"}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Gender</div>
                        <div className="font-medium capitalize">{formValues.gender || "—"}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Place of Birth</div>
                      <div className="font-medium">{formValues.placeOfBirth || "—"}</div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <div className="text-muted-foreground">Father</div>
                        <div className="font-medium">{formValues.fatherName || "—"}</div>
                        <div className="text-xs text-muted-foreground tracking-widest">{formValues.fatherAadhaarNumber || "—"}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Mother</div>
                        <div className="font-medium">{formValues.motherName || "—"}</div>
                        <div className="text-xs text-muted-foreground tracking-widest">{formValues.motherAadhaarNumber || "—"}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {submissionState && (
        <Card ref={successRef} className={`w-full max-w-4xl mx-auto mt-6 transition-opacity duration-500 ${successVisible ? 'opacity-100' : 'opacity-0'}`}>
          <CardHeader>
            <CardTitle>Submission Status</CardTitle>
            <CardDescription>Track the request until the PDF is generated.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">{`Submission #${submissionState.id}`}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {submissionState.pdfReady
                    ? "The PDF is ready. You can view or download it now."
                    : "Your request is being processed. This page will update automatically."}
                </div>
                <div className="text-xs text-gray-500 mt-1">Current status: {submissionState.status}</div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!submissionState.pdfReady}
                  onClick={() => window.open(`${import.meta.env.VITE_API_URL}/submission/${submissionState.id}/pdf`, '_blank')}
                >
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!submissionState.pdfReady}
                  onClick={async () => {
                    try {
                      const response = await fetch(`${import.meta.env.VITE_API_URL}/submission/${submissionState.id}/pdf`);
                      if (!response.ok) throw new Error('Failed to download PDF');
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `birth_certificate_submission_${submissionState.id}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    } catch (err) {
                      console.error('Error downloading PDF:', err);
                    }
                  }}
                >
                  Download
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <AadhaarConsentDialog
        open={showConsentDialog}
        onConsentGiven={handleConsentGiven}
        onCancel={() => setShowConsentDialog(false)}
      />
    </>
  );
};
