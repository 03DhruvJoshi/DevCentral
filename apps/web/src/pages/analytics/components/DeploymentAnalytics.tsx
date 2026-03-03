import { ShieldAlert, Search } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";

import type { Repository } from "./types.js";

export default function DeploymentAnalytics(props: {
  selectedRepo: Repository;
}) {
  const { selectedRepo } = props;
  //   const [isDeploymentLoading, setIsDeploymentLoading] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-purple-600" />
          Deployment Metrics
        </CardTitle>
        <CardDescription>
          Showing recent deployment metrics for{" "}
          <strong>{selectedRepo.name}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* {isDeploymentLoading ? (
          <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
            <p>Analyzing deployment metrics...</p>
          </div>
        ) : ( */}
        <div className="h-[300px] flex flex-col items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground bg-muted/10">
          <Search className="h-10 w-10 mb-2 opacity-20" />
          <p className="font-medium">No deployment metrics available</p>
          <p className="text-sm mt-1">
            Ensure the repository has recent deployment activity and is properly
            integrated.
          </p>
        </div>
        {/* )} */}
      </CardContent>
    </Card>
  );
}
