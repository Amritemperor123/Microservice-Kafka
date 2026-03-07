import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

interface AadhaarConsentDialogProps {
  open: boolean;
  onConsentGiven: () => void;
  onCancel: () => void;
}

export const AadhaarConsentDialog = ({ open, onConsentGiven, onCancel }: AadhaarConsentDialogProps) => {
  const [consentChecked, setConsentChecked] = useState(false);

  const handleConfirm = () => {
    if (consentChecked) {
      onConsentGiven();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>AADHAAR Document Consent</DialogTitle>
          <DialogDescription className="space-y-4 text-left">
            <p>
              We require your consent to collect and process AADHAAR documents for birth certificate generation.
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">What we collect:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Father's AADHAAR number and document copy</li>
                <li>Mother's AADHAAR number and document copy</li>
              </ul>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">How we use this information:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Identity verification for birth certificate processing</li>
                <li>Legal compliance with government regulations</li>
                <li>Secure storage in encrypted systems</li>
              </ul>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Your rights:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>You can withdraw consent at any time</li>
                <li>Data will be deleted upon request (subject to legal requirements)</li>
                <li>Data is protected with industry-standard security measures</li>
              </ul>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2 py-4">
          <Checkbox
            id="consent"
            checked={consentChecked}
            onCheckedChange={(checked) => setConsentChecked(checked as boolean)}
          />
          <label htmlFor="consent" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            I consent to the collection and processing of AADHAAR documents as described above
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!consentChecked}>
            Give Consent & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};