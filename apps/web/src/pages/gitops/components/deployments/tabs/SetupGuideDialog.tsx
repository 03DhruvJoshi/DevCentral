import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../../components/ui/dialog.js";
import type { ServiceDef } from "../types.js";

export default function SetupGuideDialog({
  guideService,
  setGuideService,
}: {
  guideService: ServiceDef | null;
  setGuideService: (s: ServiceDef | null) => void;
}) {
  return (
    <Dialog
      open={!!guideService}
      onOpenChange={(open) => {
        if (!open) setGuideService(null);
      }}
    >
      {guideService && (
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <guideService.icon
                className={`h-5 w-5 ${guideService.iconColor}`}
              />
              {guideService.guideTitle}
            </DialogTitle>
            <DialogDescription>
              Follow these steps to integrate {guideService.name} with
              DevCentral via GitHub Deployments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {guideService.guideSteps?.map((step, i) => (
              <div key={step} className="flex items-start gap-3">
                <div className="shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold">
                  {i + 1}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pt-0.5">
                  {step}
                </p>
              </div>
            ))}
            <div className="bg-muted/60 rounded-lg p-3 text-xs text-muted-foreground mt-4">
              Once connected, {guideService.name} deployment events will appear
              automatically in the Deployment History table above.
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
