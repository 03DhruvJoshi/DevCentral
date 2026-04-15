type DeploymentSortCol =
  | "environment"
  | "ref"
  | "creator"
  | "createdAt"
  | "sha";

interface SecretItem {
  name: string;
  hint: string;
}

interface DeployTargetPickerProps {
  deployMode: "latest" | "specific";
  setDeployMode: (v: "latest" | "specific") => void;
  deployBranch: string;
  setDeployBranch: (v: string) => void;
  deployCommitSha: string;
  setDeployCommitSha: (v: string) => void;
  branches: string[];
  recentCommits: Array<{ sha: string; message: string; author: string }>;
}

interface ServiceDef {
  id: string;
  name: string;
  description: string;
  status: "connected" | "available" | "coming_soon";
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  guideTitle?: string;
  guideSteps?: string[];
}

export type {
  DeploymentSortCol,
  SecretItem,
  DeployTargetPickerProps,
  ServiceDef,
};
