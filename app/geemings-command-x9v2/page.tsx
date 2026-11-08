'use client';
import SupremeAdminGate from '../../components/SupremeAdminGate';
import GodModeCommandCenter from '../../components/GodModeCommandCenter';

export default function GEEMINGS_COMMAND() {
  return (
    <SupremeAdminGate>
      <GodModeCommandCenter />
    </SupremeAdminGate>
  );
}
