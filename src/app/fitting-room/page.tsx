import type { Metadata } from 'next';
import { FittingRoomView } from '@/views/FittingRoom';

export const metadata: Metadata = { title: 'Fitting room' };

export default function Page() {
  return <FittingRoomView />;
}
