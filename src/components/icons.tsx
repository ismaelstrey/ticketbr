import { ReactNode } from "react";

function Icon({ symbol }: { symbol: ReactNode }) {
  return <span aria-hidden="true">{symbol}</span>;
}

export const FiAlertCircle = () => <Icon symbol="⚠" />;
export const FiBookOpen = () => <Icon symbol="📘" />;
export const FiCheckCircle = () => <Icon symbol="✔" />;
export const FiClock = () => <Icon symbol="🕒" />;
export const FiFilter = () => <Icon symbol="⛃" />;
export const FiGrid = () => <Icon symbol="☷" />;
export const FiHash = () => <Icon symbol="#" />;
export const FiHelpCircle = () => <Icon symbol="?" />;
export const FiHome = () => <Icon symbol="⌂" />;
export const FiList = () => <Icon symbol="≡" />;
export const FiPauseCircle = () => <Icon symbol="⏸" />;
export const FiSearch = () => <Icon symbol="⌕" />;
export const FiSettings = () => <Icon symbol="⚙" />;
export const FiTool = () => <Icon symbol="🛠" />;
export const FiUser = () => <Icon symbol="👤" />;
export const FiUsers = () => <Icon symbol="👥" />;
export const FiWifi = () => <Icon symbol="📶" />;
export const FiZap = () => <Icon symbol="⚡" />;
export const FiLogOut = () => <Icon symbol="🚪" />;
