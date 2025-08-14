import TargetPanel from '@/components/TargetPanel';
import CritiquePanel from '@/components/CritiquePanel';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* <header className="p-4 border-b border-gray-200 font-bold text-xl bg-white">Criticmate</header> */}
      <main className="flex h-screen p-4 gap-4">
        {/* Upload Panel */}
        <div className="w-1/8 min-w-[300px]">
          <TargetPanel />
        </div>

        {/* Main Panel */}
        <div className="flex-1">
          <CritiquePanel />
        </div>
      </main>
    </div>
  );
}