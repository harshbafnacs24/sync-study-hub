import { useEffect, useState } from "react";
interface Props { onDone?: () => void; minDuration?: number; }
export function SplashScreen({ onDone, minDuration = 2200 }: Props) {
  const [out, setOut] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setOut(true), minDuration - 400);
    const t2 = setTimeout(() => onDone?.(), minDuration);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [minDuration, onDone]);
  return (
    <div style={{ position:"fixed",inset:0,zIndex:9999,background:"#000",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:32,transition:"opacity 0.4s ease",opacity:out?0:1,pointerEvents:out?"none":"all" }}>
      <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:12,animation:"ss-up 0.7s cubic-bezier(0.22,1,0.36,1) both" }}>
        <div style={{ fontFamily:"'Syne',system-ui,sans-serif",fontWeight:900,fontSize:"clamp(48px,14vw,68px)",letterSpacing:"-0.04em",color:"#E5FF00",lineHeight:1,animation:"ss-breathe 2.4s ease-in-out 0.7s infinite" }}>S&S</div>
        <div style={{ fontFamily:"'DM Mono',monospace",fontWeight:500,fontSize:10,letterSpacing:"0.22em",color:"rgba(229,255,0,0.3)",textTransform:"uppercase",animation:"ss-in 0.5s ease 0.8s both" }}>Sync &amp; Study</div>
      </div>
      <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:10 }}>
        <div style={{ width:48,height:1.5,background:"rgba(229,255,0,0.1)",borderRadius:2,overflow:"hidden",animation:"ss-in 0.4s ease 0.7s both" }}>
          <div style={{ height:"100%",background:"#E5FF00",borderRadius:2,animation:`ss-load ${minDuration*0.85}ms cubic-bezier(0.4,0,0.2,1) 0.9s both` }} />
        </div>
        <div style={{ display:"flex",gap:5,animation:"ss-in 0.4s ease 0.9s both" }}>
          {[0,1,2].map(i=><div key={i} style={{ width:3,height:3,borderRadius:"50%",background:"#E5FF00",animation:`ss-dot 1.2s ease-in-out ${1.1+i*0.2}s infinite` }} />)}
        </div>
      </div>
      <style>{`
        @keyframes ss-up{from{opacity:0;transform:translateY(10px) scale(0.95)}to{opacity:1;transform:none}}
        @keyframes ss-in{from{opacity:0}to{opacity:1}}
        @keyframes ss-breathe{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.8;transform:scale(.985)}}
        @keyframes ss-load{from{width:0}to{width:100%}}
        @keyframes ss-dot{0%,100%{opacity:.18;transform:scale(1)}50%{opacity:1;transform:scale(1.5)}}
      `}</style>
    </div>
  );
}