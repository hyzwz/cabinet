// Auto-generated barrel — merges all domain message files

import { agentsEn, agentsZh } from "./agents";
import { authEn, authZh } from "./auth";
import { cabinetsEn, cabinetsZh } from "./cabinets";
import { coreEn, coreZh } from "./core";
import { editorEn, editorZh } from "./editor";
import { homeEn, homeZh } from "./home";
import { layoutEn, layoutZh } from "./layout";
import { missionControlEn, missionControlZh } from "./mission-control";
import { searchEn, searchZh } from "./search";
import { settingsEn, settingsZh } from "./settings";
import { sidebarEn, sidebarZh } from "./sidebar";
import { tasksEn, tasksZh } from "./tasks";

export const allEnMessages = {
  ...agentsEn,
  ...authEn,
  ...cabinetsEn,
  ...coreEn,
  ...editorEn,
  ...homeEn,
  ...layoutEn,
  ...missionControlEn,
  ...searchEn,
  ...settingsEn,
  ...sidebarEn,
  ...tasksEn,
} as const;

export type AllMessageKeys = keyof typeof allEnMessages;

export const allZhMessages: Partial<Record<AllMessageKeys, string>> = {
  ...agentsZh,
  ...authZh,
  ...cabinetsZh,
  ...coreZh,
  ...editorZh,
  ...homeZh,
  ...layoutZh,
  ...missionControlZh,
  ...searchZh,
  ...settingsZh,
  ...sidebarZh,
  ...tasksZh,
};
