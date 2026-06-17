console.log("app.jsx: Start execution");
const { useState, useRef, useEffect } = React;

var MODEL = "claude-sonnet-4-6";

async function ask(messages, system = "") {
  const res = await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, system, messages }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  const text = data?.content?.find(b => b.type === "text")?.text;
  if (!text) throw new Error("Empty response");
  return text;
}

function parseJSON(raw) {
  try { return JSON.parse(raw.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim()); }
  catch { return null; }
}

// ── STUDY FOLDERS SHARING UTILITIES ──────────────────────────────────────────
function encodeFolderForUrl(folder) {
  try {
    const dataToShare = {
      name: folder.name,
      items: folder.items.map(item => ({
        type: item.type,
        title: item.title,
        content: item.content
      }))
    };
    const str = JSON.stringify(dataToShare);
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    console.error("Failed to encode folder:", e);
    return null;
  }
}

function decodeFolderFromUrl(base64) {
  try {
    const str = decodeURIComponent(escape(atob(base64)));
    const parsed = JSON.parse(str);
    if (parsed && typeof parsed.name === "string" && Array.isArray(parsed.items)) {
      return {
        id: "f_" + Date.now() + "_" + Math.random().toString(36).substring(2, 11),
        name: parsed.name,
        createdAt: new Date().toISOString(),
        items: parsed.items.map(item => ({
          ...item,
          id: "i_" + Date.now() + "_" + Math.random().toString(36).substring(2, 11),
          timestamp: new Date().toISOString()
        }))
      };
    }
  } catch (e) {
    console.error("Failed to decode folder:", e);
  }
  return null;
}

// ── SAVE TO FOLDER MODAL ──────────────────────────────────────────────────────
function SaveToFolderModal({ folders, addFolder, addItemToFolder, item, onClose }) {
  const [selectedId, setSelectedId] = useState(folders[0]?.id || "");
  const [newFolderName, setNewFolderName] = useState("");
  const [showCreate, setShowCreate] = useState(folders.length === 0);
  const [success, setSuccess] = useState(false);

  function handleSave() {
    let folderId = selectedId;
    if (showCreate) {
      if (!newFolderName.trim()) return;
      const created = addFolder(newFolderName);
      folderId = created.id;
    }
    if (!folderId) return;
    addItemToFolder(folderId, item);
    setSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1000);
  }

  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(11,12,16,0.85)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }}>
      <div style={{ background:"#161722", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, padding:24, width:"100%", maxWidth:400, boxShadow:"0 20px 50px rgba(0,0,0,0.6)", position:"relative", color:"#f3f4f6", fontFamily:"'Outfit',sans-serif" }}>
        <button onClick={onClose} style={{ position:"absolute", top:16, right:16, background:"none", border:"none", color:"#9ca3af", fontSize:24, cursor:"pointer", boxShadow:"none", padding:0, display:"flex", alignItems:"center", justifyContent:"center", width:32, height:32, borderRadius:"50%" }}>×</button>
        <h3 style={{ margin:"0 0 18px", color:"#f3f4f6", fontSize:18, fontWeight:600, display:"flex", alignItems:"center", gap:8 }}>
          <i className="ti ti-folder-plus" style={{ color:"#818cf8", fontSize:22 }}></i> Save to Folder
        </h3>
        
        {success ? (
          <div style={{ textAlign:"center", padding:"30px 0" }}>
            <div style={{ width:54, height:54, borderRadius:"50%", background:"rgba(52,211,153,0.15)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <i className="ti ti-circle-check" style={{ color:"#34d399", fontSize:32 }}></i>
            </div>
            <div style={{ color:"#34d399", fontWeight:600, fontSize:15 }}>Successfully Saved!</div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {!showCreate ? (
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:"#9ca3af", display:"block", marginBottom:6 }}>Select Destination Folder</label>
                <div style={{ display:"flex", gap:8 }}>
                  <select value={selectedId} onChange={e => setSelectedId(e.target.value)} style={{ flex:1, padding:"10px 12px", background:"#1c1d28", border:"1px solid #2d2f3d", borderRadius:10, color:"#f3f4f6", fontSize:13 }}>
                    {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <button onClick={() => setShowCreate(true)} style={{ padding:"8px 12px", background:"#2d2f3d", color:"#f3f4f6", border:"none", borderRadius:10, cursor:"pointer", fontSize:12, boxShadow:"none", display:"flex", alignItems:"center", gap:4 }}>
                    <i className="ti ti-plus"></i> New
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:"#9ca3af", display:"block", marginBottom:6 }}>Create New Folder</label>
                <div style={{ display:"flex", gap:8 }}>
                  <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="e.g. History Exam Study..." style={{ flex:1, padding:"10px 12px", background:"#1c1d28", border:"1px solid #2d2f3d", borderRadius:10, color:"#f3f4f6", fontSize:13 }} />
                  {folders.length > 0 && (
                    <button onClick={() => setShowCreate(false)} style={{ padding:"8px 12px", background:"transparent", color:"#9ca3af", border:"1px solid #2d2f3d", borderRadius:10, cursor:"pointer", fontSize:12, boxShadow:"none" }}>Cancel</button>
                  )}
                </div>
              </div>
            )}
            
            <div style={{ display:"flex", gap:10, marginTop:8 }}>
              <button onClick={onClose} style={{ flex:1, background:"transparent", border:"1px solid #2d2f3d", color:"#f3f4f6", padding:10, borderRadius:10, fontSize:13, fontWeight:500, boxShadow:"none" }}>Close</button>
              <button onClick={handleSave} style={{ flex:1, background:"linear-gradient(135deg, #6366f1, #4f46e5)", color:"#fff", padding:10, borderRadius:10, fontSize:13, fontWeight:600 }}>Save Material</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SHARED ────────────────────────────────────────────────────────────────────
function Spinner() {
  return <span style={{ display:"inline-block", width:15, height:15, border:"2px solid currentColor", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite", verticalAlign:"middle" }} />;
}
function ErrorBox({ msg }) {
  return msg ? <div style={{ padding:"10px 14px", background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, color:"#dc2626", fontSize:13 }}>⚠ {msg}</div> : null;
}
function ResultBox({ children, label }) {
  return (
    <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12, padding:"1rem 1.2rem" }}>
      {label && <p style={{ margin:"0 0 8px", fontSize:11, fontWeight:600, color:"#94a3b8", letterSpacing:"0.06em", textTransform:"uppercase" }}>{label}</p>}
      <div style={{ fontSize:14, lineHeight:1.75, color:"#1e293b", whiteSpace:"pre-wrap" }}>{children}</div>
    </div>
  );
}
function Btn({ onClick, disabled, children, variant="primary", small }) {
  const base = { border:"none", borderRadius:8, cursor: disabled?"not-allowed":"pointer", fontWeight:600, fontSize: small?12:13, display:"inline-flex", alignItems:"center", gap:5, transition:"all 0.15s", padding: small?"6px 11px":"9px 16px" };
  const vars = {
    primary: { background: disabled?"#e2e8f0":"linear-gradient(135deg,#6366f1,#8b5cf6)", color: disabled?"#94a3b8":"#fff" },
    success: { background: disabled?"#e2e8f0":"#16a34a", color: disabled?"#94a3b8":"#fff" },
    warning: { background: disabled?"#e2e8f0":"#d97706", color: disabled?"#94a3b8":"#fff" },
    ghost:   { background:"transparent", color:"#64748b", border:"1px solid #e2e8f0" },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...vars[variant] }}>{children}</button>;
}

// ── AI TUTOR ──────────────────────────────────────────────────────────────────
function ChatTutor({ folders, addFolder, addItemToFolder }) {
  const [msgs, setMsgs] = useState([{ role:"assistant", content:"Hi! I'm your AI Study Tutor 👋\n\nAsk me anything — concepts, formulas, history, coding, science, maths. I'll explain clearly with examples." }]);
  const [input, setInput] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const [saveItem, setSaveItem] = useState(null);
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  async function send() {
    const q = input.trim(); if (!q || loading) return;
    setError(""); const nm = [...msgs, { role:"user", content:q }]; setMsgs(nm); setInput(""); setLoading(true);
    try {
      const reply = await ask(nm.map(m=>({role:m.role,content:m.content})), "You are an expert AI study tutor. Explain concepts clearly with real examples and analogies. Break complex topics into digestible steps. Be encouraging and thorough.");
      setMsgs(m=>[...m,{role:"assistant",content:reply}]);
    } catch(e) { setError(e.message); } finally { setLoading(false); }
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:500 }}>
      {msgs.length > 1 && (
        <div style={{ padding:"10px 16px", background:"#f8fafc", borderBottom:"1px solid #e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:13, fontWeight:600, color:"#475569" }}>Tutor Session</span>
          <button 
            onClick={() => setSaveItem({
              type: "chat",
              title: "Tutor Chat: " + (msgs[1]?.content?.substring(0, 30) || "Concept Discussion") + "...",
              content: msgs
            })} 
            style={{ padding:"5px 10px", fontSize:12, borderRadius:6, background:"#ede9fe", color:"#6366f1", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontWeight:600 }}
          >
            <i className="ti ti-folder-plus"></i> Save to Folder
          </button>
        </div>
      )}
      <div style={{ flex:1, overflowY:"auto", padding:"1rem", display:"flex", flexDirection:"column", gap:10 }}>
        {msgs.map((m,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
            {m.role==="assistant"&&<div style={{ width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,marginRight:8,flexShrink:0 }}>🤖</div>}
            <div style={{ maxWidth:"76%", padding:"10px 14px", fontSize:14, lineHeight:1.65, whiteSpace:"pre-wrap", borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px", background:m.role==="user"?"linear-gradient(135deg,#6366f1,#8b5cf6)":"#f1f5f9", color:m.role==="user"?"#fff":"#1e293b" }}>{m.content}</div>
          </div>
        ))}
        {loading&&<div style={{ display:"flex",alignItems:"center",gap:8,color:"#6366f1",fontSize:13 }}><Spinner /> Thinking…</div>}
        {error&&<ErrorBox msg={error}/>}
        <div ref={bottomRef}/>
      </div>
      <div style={{ padding:"0.75rem 1rem", borderTop:"1px solid #e2e8f0", display:"flex", gap:8 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} placeholder="Ask anything — e.g. Explain Newton's laws…" disabled={loading} style={{ flex:1, padding:"10px 14px", borderRadius:10, border:"1px solid #e2e8f0", fontSize:14, outline:"none" }}/>
        <Btn onClick={send} disabled={loading||!input.trim()}>{loading?<Spinner/>:"Send"}</Btn>
      </div>
      {saveItem && (
        <SaveToFolderModal 
          folders={folders} 
          addFolder={addFolder} 
          addItemToFolder={addItemToFolder} 
          item={saveItem} 
          onClose={() => setSaveItem(null)} 
        />
      )}
    </div>
  );
}

// ── SUMMARIZER ────────────────────────────────────────────────────────────────
function Summarizer({ folders, addFolder, addItemToFolder }) {
  const [text,setText]=useState(""); const [mode,setMode]=useState("concise"); const [result,setResult]=useState(""); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  const [saveItem, setSaveItem] = useState(null);
  const modes=[{id:"concise",label:"Quick Summary"},{id:"detailed",label:"Detailed Notes"},{id:"bullets",label:"Bullet Points"},{id:"eli5",label:"Simple (ELI5)"}];
  const prompts={ concise:"Summarize in 3–5 clear sentences capturing the most important ideas.", detailed:"Create comprehensive study notes. Include key concepts, definitions, important facts, and relationships.", bullets:"Convert to clear hierarchical bullet-point study notes. Group related ideas.", eli5:"Explain to a curious 12-year-old. Use simple words and relatable examples." };
  async function run() {
    if (!text.trim()||loading) return; setError("");setResult("");setLoading(true);
    try { setResult(await ask([{role:"user",content:`${prompts[mode]}\n\nText:\n${text}`}],"You are an expert educator who creates excellent study materials.")); }
    catch(e){setError(e.message);} finally{setLoading(false);}
  }
  return (
    <div style={{ padding:"1rem", display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {modes.map(m=><button key={m.id} onClick={()=>setMode(m.id)} style={{ padding:"6px 14px", fontSize:13, borderRadius:20, cursor:"pointer", fontWeight:500, background:mode===m.id?"linear-gradient(135deg,#6366f1,#8b5cf6)":"transparent", color:mode===m.id?"#fff":"#64748b", border:mode===m.id?"none":"1px solid #e2e8f0" }}>{m.label}</button>)}
      </div>
      <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Paste notes, textbook content, or any study material here…" rows={8} style={{ padding:"12px 14px", borderRadius:10, border:"1px solid #e2e8f0", fontSize:14, resize:"vertical", outline:"none", lineHeight:1.6 }}/>
      <Btn onClick={run} disabled={loading||!text.trim()}>{loading?<><Spinner/>&nbsp;Summarizing…</>:"Summarize"}</Btn>
      <ErrorBox msg={error}/>
      {result&& (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <ResultBox label="Summary">{result}</ResultBox>
          <div style={{ display:"flex", justifyContent:"flex-end" }}>
            <button 
              onClick={() => setSaveItem({
                type: "summary",
                title: "Summary: " + (text.substring(0, 30) || "Study Notes") + "...",
                content: { text, mode, result }
              })}
              style={{ padding:"8px 14px", borderRadius:8, background:"#ede9fe", color:"#6366f1", border:"none", cursor:"pointer", fontWeight:600, fontSize:13, display:"inline-flex", alignItems:"center", gap:5 }}
            >
              <i className="ti ti-folder-plus"></i> Save to Folder
            </button>
          </div>
        </div>
      )}
      {saveItem && (
        <SaveToFolderModal 
          folders={folders} 
          addFolder={addFolder} 
          addItemToFolder={addItemToFolder} 
          item={saveItem} 
          onClose={() => setSaveItem(null)} 
        />
      )}
    </div>
  );
}

// ── PDF Q&A ───────────────────────────────────────────────────────────────────
function PDFQnA({ folders, addFolder, addItemToFolder }) {
  const [docText,setDocText]=useState(""); const [fileName,setFileName]=useState(""); const [question,setQuestion]=useState(""); const [answer,setAnswer]=useState(""); const [extracting,setExtracting]=useState(false); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  const [saveItem, setSaveItem] = useState(null);
  async function handleFile(e) {
    const file=e.target.files[0]; if(!file) return;
    setFileName(file.name);setError("");setAnswer("");setDocText("");setExtracting(true);
    try {
      const base64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=()=>rej(new Error("Read failed"));r.readAsDataURL(file);});
      const text=await ask([{role:"user",content:[{type:"document",source:{type:"base64",media_type:"application/pdf",data:base64}},{type:"text",text:"Extract and return the complete text content. Return only raw extracted text."}]}],"You extract text from documents accurately.");
      setDocText(text);
    } catch(e){setError("Could not read PDF: "+e.message);} finally{setExtracting(false);}
  }
  async function askQ() {
    if(!question.trim()||!docText||loading) return; setError("");setAnswer("");setLoading(true);
    try { setAnswer(await ask([{role:"user",content:`Document:\n\n${docText}\n\n---\nQuestion: ${question}\n\nAnswer based only on the document.`}],"Answer only from the provided document. If not in document, say so clearly.")); }
    catch(e){setError(e.message);} finally{setLoading(false);}
  }
  return (
    <div style={{ padding:"1rem", display:"flex", flexDirection:"column", gap:14 }}>
      <label style={{ border:"2px dashed #c7d2fe", borderRadius:12, padding:"1.5rem", textAlign:"center", cursor:"pointer", background:docText?"#f0fdf4":"#fafbff", display:"block" }}>
        <input type="file" accept=".pdf" onChange={handleFile} style={{ display:"none" }}/>
        {extracting?<div style={{ color:"#6366f1",fontSize:14 }}><Spinner/> &nbsp;Extracting…</div>:docText?<div><div style={{ fontSize:28 }}>✅</div><p style={{ margin:"6px 0 0",fontWeight:600,fontSize:14,color:"#16a34a" }}>{fileName}</p><p style={{ margin:"4px 0 0",fontSize:12,color:"#64748b" }}>Ready — ask below</p></div>:<div><div style={{ fontSize:32 }}>📄</div><p style={{ margin:"8px 0 4px",fontWeight:600,fontSize:14,color:"#334155" }}>Click to upload a PDF</p></div>}
      </label>
      {docText&&<div style={{ display:"flex",gap:8 }}><input value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>e.key==="Enter"&&askQ()} placeholder="Ask a question about your document…" style={{ flex:1,padding:"10px 14px",borderRadius:10,border:"1px solid #e2e8f0",fontSize:14,outline:"none" }}/><Btn onClick={askQ} disabled={loading||!question.trim()}>{loading?<Spinner/>:"Ask"}</Btn></div>}
      <ErrorBox msg={error}/>{answer&&<ResultBox label="Answer">{answer}</ResultBox>}
      {docText && (
        <div style={{ display:"flex", justifyContent:"flex-end", marginTop:4 }}>
          <button 
            onClick={() => setSaveItem({
              type: "pdf",
              title: "PDF Study: " + fileName,
              content: { docText, fileName }
            })}
            style={{ padding:"8px 14px", borderRadius:8, background:"#ede9fe", color:"#6366f1", border:"none", cursor:"pointer", fontWeight:600, fontSize:13, display:"inline-flex", alignItems:"center", gap:5 }}
          >
            <i className="ti ti-folder-plus"></i> Save PDF to Folder
          </button>
        </div>
      )}
      {saveItem && (
        <SaveToFolderModal 
          folders={folders} 
          addFolder={addFolder} 
          addItemToFolder={addItemToFolder} 
          item={saveItem} 
          onClose={() => setSaveItem(null)} 
        />
      )}
    </div>
  );
}

// ── QUIZ ──────────────────────────────────────────────────────────────────────
function QuizGenerator({ folders, addFolder, addItemToFolder }) {
  const [topic,setTopic]=useState(""); const [qtype,setQtype]=useState("mcq"); const [count,setCount]=useState(5); const [questions,setQuestions]=useState([]); const [answers,setAnswers]=useState({}); const [revealed,setRevealed]=useState({}); const [score,setScore]=useState(null); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  const [saveItem, setSaveItem] = useState(null);
  async function generate() {
    if(!topic.trim()||loading) return; setError("");setQuestions([]);setAnswers({});setRevealed({});setScore(null);setLoading(true);
    try {
      const typeMap={mcq:`${count} MCQs. 4 options each. Mark correct with *. Format: [{"q":"...","options":["A","B","*C correct","D"],"answer":"C correct","explanation":"..."}]`,tf:`${count} True/False. Format: [{"q":"...","answer":"True","explanation":"..."}]`,short:`${count} short answer. Format: [{"q":"...","answer":"...","explanation":"..."}]`};
      const raw=await ask([{role:"user",content:`Generate ${typeMap[qtype]} about: ${topic}. ONLY return the JSON array.`}],"Quiz generator. Return ONLY valid JSON arrays, no other text.");
      const parsed=parseJSON(raw); if(!parsed||!Array.isArray(parsed)) throw new Error("Could not parse quiz. Try again.");
      setQuestions(parsed);
    } catch(e){setError(e.message);} finally{setLoading(false);}
  }
  function submitAll(){let c=0;const r={};questions.forEach((q,i)=>{r[i]=true;if((answers[i]||"").replace(/^\*/,"").trim().toLowerCase()===(q.answer||"").replace(/^\*/,"").trim().toLowerCase())c++;});setRevealed(r);setScore(c);}
  return (
    <div style={{ padding:"1rem", display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
        <input value={topic} onChange={e=>setTopic(e.target.value)} onKeyDown={e=>e.key==="Enter"&&generate()} placeholder="Topic or paste notes…" style={{ flex:1,minWidth:160,padding:"10px 14px",borderRadius:10,border:"1px solid #e2e8f0",fontSize:14,outline:"none" }}/>
        <select value={qtype} onChange={e=>setQtype(e.target.value)} style={{ padding:"10px 12px",borderRadius:10,border:"1px solid #e2e8f0",fontSize:13,background:"#fff" }}><option value="mcq">Multiple Choice</option><option value="tf">True / False</option><option value="short">Short Answer</option></select>
        <select value={count} onChange={e=>setCount(Number(e.target.value))} style={{ padding:"10px 12px",borderRadius:10,border:"1px solid #e2e8f0",fontSize:13,background:"#fff" }}>{[3,5,8,10].map(n=><option key={n} value={n}>{n} Qs</option>)}</select>
        <Btn onClick={generate} disabled={loading||!topic.trim()}>{loading?<><Spinner/>&nbsp;Generating…</>:"Generate Quiz"}</Btn>
      </div>
      <ErrorBox msg={error}/>
      {score!==null&&<div style={{ padding:"12px 16px",borderRadius:10,fontWeight:600,fontSize:15,textAlign:"center",background:score/questions.length>=0.7?"#f0fdf4":"#fef9c3",color:score/questions.length>=0.7?"#16a34a":"#a16207",border:`1px solid ${score/questions.length>=0.7?"#bbf7d0":"#fde68a"}` }}>{score>=questions.length?"🎉 Perfect!":score/questions.length>=0.7?"✅ Great job!":"📚 Keep studying!"} &nbsp;Score: {score}/{questions.length} ({Math.round(score/questions.length*100)}%)</div>}
      {questions.map((q,i)=>{
        const ca=(q.answer||"").replace(/^\*/,"").trim(); const ua=(answers[i]||"").replace(/^\*/,"").trim(); const ok=ua.toLowerCase()===ca.toLowerCase();
        return (<div key={i} style={{ background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:"1rem 1.2rem" }}>
          <p style={{ margin:"0 0 12px",fontSize:14,fontWeight:600,color:"#1e293b" }}>{i+1}. {q.q}</p>
          {q.options?(<div style={{ display:"flex",flexDirection:"column",gap:6 }}>{q.options.map((opt,j)=>{const oc=opt.replace(/^\*/,"").trim();const ico=opt.startsWith("*");const isSel=ua===oc;let bg="#fff",border="1px solid #e2e8f0",color="#334155";if(revealed[i]){if(ico){bg="#f0fdf4";border="1px solid #86efac";color="#16a34a";}else if(isSel&&!ico){bg="#fef2f2";border="1px solid #fca5a5";color="#dc2626";}}else if(isSel){bg="#ede9fe";border="1px solid #a5b4fc";color="#6366f1";}return(<div key={j} onClick={()=>!revealed[i]&&setAnswers(a=>({...a,[i]:oc}))} style={{ padding:"9px 14px",borderRadius:8,background:bg,border,color,fontSize:13,cursor:revealed[i]?"default":"pointer",fontWeight:isSel||(revealed[i]&&ico)?500:400 }}>{revealed[i]&&ico?"✓ ":revealed[i]&&isSel&&!ico?"✗ ":""}{oc}</div>);})}</div>)
          :(<input value={answers[i]||""} onChange={e=>setAnswers(a=>({...a,[i]:e.target.value}))} placeholder="Type your answer…" disabled={revealed[i]} style={{ width:"100%",padding:"9px 12px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:13,boxSizing:"border-box",outline:"none",background:revealed[i]?(ok?"#f0fdf4":"#fef2f2"):"#fff" }}/>)}
          {revealed[i]&&<div style={{ marginTop:10,padding:"8px 12px",background:ok?"#f0fdf4":"#fef2f2",borderRadius:8,fontSize:12,color:ok?"#16a34a":"#dc2626",border:`1px solid ${ok?"#bbf7d0":"#fecaca"}` }}>{ok?"✓ Correct! ":`✗ Answer: "${ca}". `}<span style={{ color:"#64748b" }}>{q.explanation}</span></div>}
          {!revealed[i]&&answers[i]&&<button onClick={()=>setRevealed(r=>({...r,[i]:true}))} style={{ marginTop:8,padding:"5px 12px",fontSize:12,borderRadius:6,border:"1px solid #6366f1",background:"transparent",color:"#6366f1",cursor:"pointer",fontWeight:500 }}>Check Answer</button>}
        </div>);
      })}
      {questions.length>0&& (
        <div style={{ display:"flex", gap:10 }}>
          {!score&&<Btn onClick={submitAll}>Submit All</Btn>}
          <button 
            onClick={() => setSaveItem({
              type: "quiz",
              title: "Quiz: " + topic,
              content: { questions, topic, qtype }
            })}
            style={{ padding:"9px 16px", borderRadius:8, background:"#ede9fe", color:"#6366f1", border:"none", cursor:"pointer", fontWeight:600, fontSize:13, display:"inline-flex", alignItems:"center", gap:5 }}
          >
            <i className="ti ti-folder-plus"></i> Save Quiz to Folder
          </button>
        </div>
      )}
      {saveItem && (
        <SaveToFolderModal 
          folders={folders} 
          addFolder={addFolder} 
          addItemToFolder={addItemToFolder} 
          item={saveItem} 
          onClose={() => setSaveItem(null)} 
        />
      )}
    </div>
  );
}

// ── FLASHCARDS ────────────────────────────────────────────────────────────────
function Flashcards({ folders, addFolder, addItemToFolder }) {
  const [topic,setTopic]=useState(""); const [cards,setCards]=useState([]); const [idx,setIdx]=useState(0); const [flipped,setFlipped]=useState(false); const [known,setKnown]=useState(new Set()); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  const [saveItem, setSaveItem] = useState(null);
  async function generate() {
    if(!topic.trim()||loading) return; setError("");setCards([]);setIdx(0);setFlipped(false);setKnown(new Set());setLoading(true);
    try {
      const raw=await ask([{role:"user",content:`Generate 8 study flashcards about: ${topic}. ONLY return JSON: [{"front":"term/question","back":"definition/answer"}]`}],"Flashcard generator. Return ONLY valid JSON.");
      const p=parseJSON(raw); if(!p||!Array.isArray(p)) throw new Error("Could not parse. Try again."); setCards(p);
    } catch(e){setError(e.message);} finally{setLoading(false);}
  }
  function next(mark){const nk=new Set(known);if(mark)nk.add(idx);setKnown(nk);setFlipped(false);setIdx(i=>(i+1)%cards.length);}
  const card=cards[idx]; const pct=cards.length?Math.round(known.size/cards.length*100):0;
  return (
    <div style={{ padding:"1rem", display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex",gap:8 }}><input value={topic} onChange={e=>setTopic(e.target.value)} onKeyDown={e=>e.key==="Enter"&&generate()} placeholder="Topic — e.g. Photosynthesis, French Revolution…" style={{ flex:1,padding:"10px 14px",borderRadius:10,border:"1px solid #e2e8f0",fontSize:14,outline:"none" }}/><Btn onClick={generate} disabled={loading||!topic.trim()}>{loading?<><Spinner/>&nbsp;Generating…</>:"Generate"}</Btn></div>
      <ErrorBox msg={error}/>
      {cards.length>0&&(<>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13,color:"#64748b" }}>
          <span>Card {idx+1} of {cards.length}</span>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontWeight:500 }}>{known.size} mastered · {cards.length-known.size} left</span>
            <button 
              onClick={() => setSaveItem({
                type: "flashcards",
                title: "Flashcards: " + topic,
                content: { cards, topic }
              })}
              style={{ padding:"3px 8px", fontSize:11, borderRadius:6, background:"#ede9fe", color:"#6366f1", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:3, fontWeight:600 }}
            >
              <i className="ti ti-folder-plus"></i> Save
            </button>
          </div>
        </div>
        <div style={{ background:"#e2e8f0",borderRadius:99,height:5 }}><div style={{ width:`${pct}%`,height:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",borderRadius:99,transition:"width 0.4s" }}/></div>
        <div onClick={()=>setFlipped(f=>!f)} style={{ minHeight:200,borderRadius:14,border:`2px solid ${flipped?"#a5b4fc":"#e2e8f0"}`,background:flipped?"linear-gradient(135deg,#ede9fe,#ddd6fe)":"#f8fafc",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem",cursor:"pointer",transition:"all 0.25s",textAlign:"center" }}>
          <div><p style={{ margin:"0 0 10px",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:flipped?"#7c3aed":"#94a3b8" }}>{flipped?"Answer":"Tap to reveal"}</p><p style={{ margin:0,fontSize:19,fontWeight:600,color:flipped?"#4c1d95":"#1e293b",lineHeight:1.5 }}>{flipped?card.back:card.front}</p></div>
        </div>
        {flipped?(<div style={{ display:"flex",gap:8 }}><button onClick={()=>next(false)} style={{ flex:1,padding:11,borderRadius:10,border:"1px solid #fca5a5",background:"#fef2f2",color:"#dc2626",fontWeight:600,fontSize:13,cursor:"pointer" }}>✗ Still Learning</button><button onClick={()=>next(true)} style={{ flex:1,padding:11,borderRadius:10,border:"1px solid #86efac",background:"#f0fdf4",color:"#16a34a",fontWeight:600,fontSize:13,cursor:"pointer" }}>✓ Got It!</button></div>)
        :<p style={{ textAlign:"center",fontSize:12,color:"#94a3b8",margin:0 }}>Click card to flip</p>}
        {known.size===cards.length&&<div style={{ textAlign:"center",padding:"1rem",background:"#f0fdf4",borderRadius:12,border:"1px solid #bbf7d0" }}><div style={{ fontSize:24 }}>🎉</div><p style={{ margin:"6px 0 0",fontWeight:600,color:"#16a34a" }}>All {cards.length} cards mastered!</p></div>}
      </>)}
      {saveItem && (
        <SaveToFolderModal 
          folders={folders} 
          addFolder={addFolder} 
          addItemToFolder={addItemToFolder} 
          item={saveItem} 
          onClose={() => setSaveItem(null)} 
        />
      )}
    </div>
  );
}

// ── STUDY PLANNER ─────────────────────────────────────────────────────────────
function StudyPlanner({ folders, addFolder, addItemToFolder }) {
  const [subject,setSubject]=useState(""); const [examDate,setExamDate]=useState(""); const [hours,setHours]=useState(2); const [level,setLevel]=useState("beginner"); const [plan,setPlan]=useState(""); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  const [saveItem, setSaveItem] = useState(null);
  async function generate() {
    if(!subject.trim()||loading) return; setError("");setPlan("");setLoading(true);
    try {
      const days=examDate?Math.max(1,Math.ceil((new Date(examDate)-new Date())/86400000)):null;
      setPlan(await ask([{role:"user",content:`Create a detailed study plan.\nSubject: ${subject}\nLevel: ${level}\nHours/day: ${hours}\n${days?`Days until exam: ${days}`:"Ongoing plan"}\nInclude: day-by-day schedule, milestones, revision days, subject-specific tips, motivating opening.`}],"Expert academic coach. Be specific about daily topics. Be motivating and realistic."));
    } catch(e){setError(e.message);} finally{setLoading(false);}
  }
  return (
    <div style={{ padding:"1rem", display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
        <div><label style={{ fontSize:12,fontWeight:600,color:"#64748b",display:"block",marginBottom:5 }}>Subject / Topics *</label><input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="e.g. Calculus, Organic Chemistry…" style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:"1px solid #e2e8f0",fontSize:14,outline:"none",boxSizing:"border-box" }}/></div>
        <div><label style={{ fontSize:12,fontWeight:600,color:"#64748b",display:"block",marginBottom:5 }}>Exam Date (optional)</label><input type="date" value={examDate} onChange={e=>setExamDate(e.target.value)} style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:"1px solid #e2e8f0",fontSize:14,outline:"none",boxSizing:"border-box" }}/></div>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
        <div><label style={{ fontSize:12,fontWeight:600,color:"#64748b",display:"block",marginBottom:5 }}>Current Level</label><select value={level} onChange={e=>setLevel(e.target.value)} style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:"1px solid #e2e8f0",fontSize:14,background:"#fff",boxSizing:"border-box" }}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
        <div><label style={{ fontSize:12,fontWeight:600,color:"#64748b",display:"block",marginBottom:5 }}>Study hours / day: <strong>{hours}h</strong></label><input type="range" min={0.5} max={8} step={0.5} value={hours} onChange={e=>setHours(Number(e.target.value))} style={{ width:"100%",accentColor:"#6366f1",marginTop:6 }}/></div>
      </div>
      <Btn onClick={generate} disabled={loading||!subject.trim()}>{loading?<><Spinner/>&nbsp;Creating plan…</>:"📅 Create Study Plan"}</Btn>
      <ErrorBox msg={error}/>
      {plan && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <ResultBox label="Your Study Plan">{plan}</ResultBox>
          <div style={{ display:"flex", justifyContent:"flex-end" }}>
            <button 
              onClick={() => setSaveItem({
                type: "planner",
                title: "Study Plan: " + subject,
                content: { plan, subject, examDate, hours, level }
              })}
              style={{ padding:"8px 14px", borderRadius:8, background:"#ede9fe", color:"#6366f1", border:"none", cursor:"pointer", fontWeight:600, fontSize:13, display:"inline-flex", alignItems:"center", gap:5 }}
            >
              <i className="ti ti-folder-plus"></i> Save to Folder
            </button>
          </div>
        </div>
      )}
      {saveItem && (
        <SaveToFolderModal 
          folders={folders} 
          addFolder={addFolder} 
          addItemToFolder={addItemToFolder} 
          item={saveItem} 
          onClose={() => setSaveItem(null)} 
        />
      )}
    </div>
  );
}

// ── CODE EDITOR ───────────────────────────────────────────────────────────────

var LANGUAGES = [
  { id:"javascript", label:"JavaScript", icon:"🟨", canRun:true  },
  { id:"html",       label:"HTML/CSS",   icon:"🌐", canRun:true  },
  { id:"python",     label:"Python",     icon:"🐍", canRun:false },
  { id:"java",       label:"Java",       icon:"☕", canRun:false },
  { id:"cpp",        label:"C++",        icon:"⚙️", canRun:false },
  { id:"c",          label:"C",          icon:"🔵", canRun:false },
  { id:"typescript", label:"TypeScript", icon:"🔷", canRun:false },
  { id:"sql",        label:"SQL",        icon:"🗄️", canRun:false },
  { id:"go",         label:"Go",         icon:"🐹", canRun:false },
  { id:"rust",       label:"Rust",       icon:"🦀", canRun:false },
  { id:"ruby",       label:"Ruby",       icon:"💎", canRun:false },
  { id:"swift",      label:"Swift",      icon:"🍎", canRun:false },
  { id:"kotlin",     label:"Kotlin",     icon:"🎯", canRun:false },
  { id:"bash",       label:"Bash",       icon:"🖥️", canRun:false },
];

var STARTERS = {
javascript: `// JavaScript — runs live in your browser!
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Print first 10 Fibonacci numbers
for (let i = 0; i < 10; i++) {
  console.log(\`fib(\${i}) = \${fibonacci(i)}\`);
}

// Array methods
const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const evenSquares = nums.filter(n => n % 2 === 0).map(n => n ** 2);
console.log("Even squares:", evenSquares);`,

html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Page</title>
  <style>
    body { font-family: sans-serif; padding: 20px; background: #f0f4ff; margin: 0; }
    h1 { color: #6366f1; }
    .card { background: white; padding: 16px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin: 12px 0; }
    button { padding: 8px 16px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
    button:hover { background: #4f46e5; }
    #output { margin-top: 10px; color: #16a34a; font-weight: bold; }
  </style>
</head>
<body>
  <h1>🧠 Hello from HTML!</h1>
  <div class="card">
    <p>Edit this code and click <strong>Run</strong> to preview it live.</p>
    <button onclick="document.getElementById('output').textContent = 'Button clicked! 🎉'">Click Me</button>
    <div id="output"></div>
  </div>
</body>
</html>`,

python: `# Python
def is_prime(n):
    if n < 2:
        return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    return True

# Find primes up to 50
primes = [n for n in range(2, 51) if is_prime(n)]
print("Primes up to 50:", primes)

# Dictionary example
student = {"name": "Alice", "grade": 95, "subject": "Math"}
print(f"{student['name']} scored {student['grade']} in {student['subject']}")`,

java: `// Java
import java.util.ArrayList;
import java.util.List;

public class Main {
    public static int factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }

    public static void main(String[] args) {
        System.out.println("Hello, World!");
        
        // Factorials
        for (int i = 1; i <= 8; i++) {
            System.out.println(i + "! = " + factorial(i));
        }
        
        // ArrayList
        List<String> fruits = new ArrayList<>();
        fruits.add("Apple");
        fruits.add("Banana");
        fruits.add("Cherry");
        System.out.println("Fruits: " + fruits);
    }
}`,

cpp: `// C++
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    
    // Vector and sorting
    vector<int> nums = {64, 34, 25, 12, 22, 11, 90};
    cout << "Before sort: ";
    for (int n : nums) cout << n << " ";
    cout << endl;
    
    sort(nums.begin(), nums.end());
    cout << "After sort:  ";
    for (int n : nums) cout << n << " ";
    cout << endl;
    
    // Find max
    cout << "Maximum: " << *max_element(nums.begin(), nums.end()) << endl;
    return 0;
}`,

c: `// C
#include <stdio.h>
#include <math.h>

int isPrime(int n) {
    if (n < 2) return 0;
    for (int i = 2; i <= (int)sqrt(n); i++)
        if (n % i == 0) return 0;
    return 1;
}

int main() {
    printf("Hello, World!\\n");
    
    printf("Primes up to 30: ");
    for (int i = 2; i <= 30; i++)
        if (isPrime(i)) printf("%d ", i);
    printf("\\n");
    
    // Fibonacci
    int a = 0, b = 1;
    printf("Fibonacci: ");
    for (int i = 0; i < 10; i++) {
        printf("%d ", a);
        int tmp = a + b; a = b; b = tmp;
    }
    printf("\\n");
    return 0;
}`,

typescript: `// TypeScript
interface Student {
  name: string;
  grades: number[];
  subject: string;
}

function average(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function getLetterGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

const students: Student[] = [
  { name: "Alice", grades: [92, 88, 95, 91], subject: "Math" },
  { name: "Bob",   grades: [75, 82, 79, 85], subject: "Science" },
  { name: "Carol", grades: [60, 65, 70, 68], subject: "History" },
];

students.forEach(s => {
  const avg = average(s.grades);
  console.log(\`\${s.name} (\${s.subject}): avg=\${avg.toFixed(1)}, grade=\${getLetterGrade(avg)}\`);
});`,

sql: `-- SQL: Student Grade Database
CREATE TABLE students (
    id      INTEGER PRIMARY KEY,
    name    TEXT NOT NULL,
    subject TEXT,
    grade   INTEGER
);

INSERT INTO students VALUES
    (1, 'Alice',   'Math',    95),
    (2, 'Bob',     'Science', 82),
    (3, 'Carol',   'Math',    91),
    (4, 'David',   'Science', 74),
    (5, 'Eva',     'History', 88),
    (6, 'Frank',   'History', 67);

-- Top students
SELECT name, subject, grade
FROM students
WHERE grade >= 85
ORDER BY grade DESC;

-- Average by subject
SELECT subject,
       ROUND(AVG(grade), 1) AS avg_grade,
       COUNT(*) AS total_students
FROM students
GROUP BY subject
ORDER BY avg_grade DESC;`,

go: `// Go
package main

import (
    "fmt"
    "strings"
)

func reverseString(s string) string {
    runes := []rune(s)
    for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
        runes[i], runes[j] = runes[j], runes[i]
    }
    return string(runes)
}

func isPalindrome(s string) bool {
    s = strings.ToLower(s)
    return s == reverseString(s)
}

func main() {
    fmt.Println("Hello, Go!")
    
    words := []string{"racecar", "hello", "madam", "world", "level"}
    for _, w := range words {
        fmt.Printf("%-10s -> palindrome: %v\\n", w, isPalindrome(w))
    }
}`,

rust: `// Rust
fn fibonacci(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

fn is_even(n: i32) -> bool {
    n % 2 == 0
}

fn main() {
    println!("Hello, Rust!");
    
    // Fibonacci
    println!("Fibonacci sequence:");
    for i in 0..10 {
        print!("{} ", fibonacci(i));
    }
    println!();
    
    // Iterators
    let numbers: Vec<i32> = (1..=10).collect();
    let even_sum: i32 = numbers.iter().filter(|&&x| is_even(x)).sum();
    println!("Sum of even numbers 1-10: {}", even_sum);
}`,

ruby: `# Ruby
def bubble_sort(arr)
  n = arr.length
  loop do
    swapped = false
    (n - 1).times do |i|
      if arr[i] > arr[i + 1]
        arr[i], arr[i + 1] = arr[i + 1], arr[i]
        swapped = true
      end
    end
    break unless swapped
  end
  arr
end

puts "Hello, Ruby!"

nums = [64, 34, 25, 12, 22, 11, 90]
puts "Before: #{nums}"
puts "After:  #{bubble_sort(nums)}"

# Hashes
student = { name: "Alice", grade: 95, subject: "Math" }
puts "#{student[:name]} got #{student[:grade]} in #{student[:subject]}"`,

swift: `// Swift
func factorial(_ n: Int) -> Int {
    guard n > 1 else { return 1 }
    return n * factorial(n - 1)
}

struct Student {
    let name: String
    let grade: Int
    var letterGrade: String {
        switch grade {
        case 90...: return "A"
        case 80..<90: return "B"
        case 70..<80: return "C"
        default: return "F"
        }
    }
}

print("Hello, Swift!")

for i in 1...8 {
    print("\(i)! = \(factorial(i))")
}

let students = [
    Student(name: "Alice", grade: 95),
    Student(name: "Bob", grade: 82),
    Student(name: "Carol", grade: 71),
]

students.forEach { s in
    print("\(s.name): \(s.grade) → \(s.letterGrade)")
}`,

kotlin: `// Kotlin
fun isPrime(n: Int): Boolean {
    if (n < 2) return false
    return (2..Math.sqrt(n.toDouble()).toInt()).none { n % it == 0 }
}

data class Student(val name: String, val grade: Int) {
    val letterGrade: String get() = when {
        grade >= 90 -> "A"
        grade >= 80 -> "B"
        grade >= 70 -> "C"
        else -> "F"
    }
}

fun main() {
    println("Hello, Kotlin!")
    
    val primes = (2..30).filter { isPrime(it) }
    println("Primes up to 30: $primes")
    
    val students = listOf(
        Student("Alice", 95),
        Student("Bob", 82),
        Student("Carol", 71)
    )
    students.forEach { println("\${it.name}: \${it.grade} → \${it.letterGrade}") }
}`,

bash: `#!/bin/bash
# Bash Script

echo "Hello, World!"

# Variables
NAME="Study Assistant"
VERSION="1.0"
echo "App: $NAME v$VERSION"

# Loop
echo "Counting to 5:"
for i in {1..5}; do
    echo "  Number: $i"
done

# Functions
check_even() {
    if (( $1 % 2 == 0 )); then
        echo "$1 is even"
    else
        echo "$1 is odd"
    fi
}

for n in 3 4 7 8 11 12; do
    check_even $n
done`,
};

function runJavaScript(code) {
  const logs = [];
  const fakeConsole = {
    log:   (...a) => logs.push(a.map(v => typeof v === "object" ? JSON.stringify(v, null, 2) : String(v)).join(" ")),
    error: (...a) => logs.push("❌ " + a.map(String).join(" ")),
    warn:  (...a) => logs.push("⚠ " + a.map(String).join(" ")),
    info:  (...a) => logs.push("ℹ " + a.map(String).join(" ")),
    table: (d)    => logs.push(JSON.stringify(d, null, 2)),
  };
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("console", code);
    const ret = fn(fakeConsole);
    if (ret !== undefined && logs.length === 0) logs.push(String(ret));
    return { success: true, output: logs.join("\n") || "(code ran — no output)" };
  } catch (e) {
    return { success: false, output: logs.join("\n"), error: e.toString() };
  }
}

function CodeEditor({ folders, addFolder, addItemToFolder }) {
  const langMeta = LANGUAGES[0];
  const [lang, setLang] = useState("javascript");
  const [code, setCode] = useState(STARTERS["javascript"]);
  const [output, setOutput] = useState(null);
  const [aiPanel, setAiPanel] = useState(null); // { type, content }
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const textareaRef = useRef(null);
  const iframeRef = useRef(null);
  const lineBoxRef = useRef(null);
  const [saveItem, setSaveItem] = useState(null);

  const currentLang = LANGUAGES.find(l => l.id === lang) || LANGUAGES[0];

  function changeLang(newLang) {
    setLang(newLang);
    setCode(STARTERS[newLang] || "");
    setOutput(null);
    setAiPanel(null);
    setError("");
  }

  // Sync line number scroll with textarea scroll
  function handleScroll(e) {
    if (lineBoxRef.current) lineBoxRef.current.scrollTop = e.target.scrollTop;
  }

  // Tab key → 2 spaces
  function handleKeyDown(e) {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = textareaRef.current;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newCode = code.substring(0, start) + "  " + code.substring(end);
      setCode(newCode);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 2; });
    }
  }

  function runCode() {
    setError(""); setAiPanel(null); setOutput(null);
    if (lang === "javascript") {
      const res = runJavaScript(code);
      setOutput({ type: res.success ? "success" : "error", text: res.output, error: res.error });
    } else if (lang === "html") {
      setOutput({ type: "html" });
    } else {
      runWithClaude("run");
    }
  }

  async function runWithClaude(type) {
    if (!code.trim() || loading) return;
    setLoading(true); setAction(type); setError(""); setAiPanel(null); setOutput(null);
    try {
      const prompts = {
        run: `Simulate running this ${currentLang.label} code and show the exact output it would produce. Format your response as:\n**Output:**\n\`\`\`\n(output here)\n\`\`\`\nIf there are errors, show them exactly as the compiler/interpreter would.`,
        debug: `Analyze this ${currentLang.label} code for bugs, errors, and issues. For each issue:\n1. State the problem clearly\n2. Show the exact line(s) with the bug\n3. Provide the corrected code\n4. Explain why it was wrong\n\nAlso suggest any performance or best-practice improvements.`,
        explain: `Explain this ${currentLang.label} code in detail for a student. Cover:\n1. **Overall purpose** — what does this code do?\n2. **Line-by-line breakdown** — explain each important section\n3. **Key concepts used** — data structures, algorithms, patterns\n4. **How it works** — step-by-step execution flow\n5. **Learning takeaways** — what concepts does this teach?`,
      };
      const result = await ask(
        [{ role: "user", content: `${prompts[type]}\n\n\`\`\`${lang}\n${code}\n\`\`\`` }],
        `You are an expert ${currentLang.label} programmer and teacher. Be precise, educational, and thorough.`
      );
      setAiPanel({ type, content: result });
    } catch(e) { setError(e.message); }
    finally { setLoading(false); setAction(""); }
  }

  const lines = code.split("\n").length;

  const panelLabels = { run:"▶ Simulated Output", debug:"🐛 Debug Report", explain:"💡 Code Explanation" };

  return (
    <div style={{ display:"flex", flexDirection:"column" }}>
      {/* Toolbar */}
      <div style={{ padding:"10px 14px", background:"#1a1b2e", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", borderBottom:"1px solid #2d2f50" }}>
        {/* Language picker */}
        <select
          value={lang} onChange={e => changeLang(e.target.value)}
          style={{ padding:"6px 10px", borderRadius:7, border:"1px solid #3d3f60", background:"#252640", color:"#e2e8f0", fontSize:13, fontWeight:500, cursor:"pointer" }}>
          {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.icon} {l.label}</option>)}
        </select>

        <div style={{ flex:1 }}/>

        {/* Action buttons */}
        <button onClick={runCode} disabled={loading} style={{ padding:"7px 14px", borderRadius:7, border:"none", background:loading&&action==="run"?"#1a5c1a":"#16a34a", color:"#fff", fontSize:13, fontWeight:600, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:5 }}>
          {loading&&action==="run"?<><Spinner/>&nbsp;Running…</>:"▶ Run"}
        </button>
        <button onClick={()=>runWithClaude("debug")} disabled={loading} style={{ padding:"7px 14px", borderRadius:7, border:"none", background:loading&&action==="debug"?"#7c2d12":"#ea580c", color:"#fff", fontSize:13, fontWeight:600, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:5 }}>
          {loading&&action==="debug"?<><Spinner/>&nbsp;Debugging…</>:"🐛 Debug"}
        </button>
        <button onClick={()=>runWithClaude("explain")} disabled={loading} style={{ padding:"7px 14px", borderRadius:7, border:"none", background:loading&&action==="explain"?"#312e81":"#6366f1", color:"#fff", fontSize:13, fontWeight:600, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:5 }}>
          {loading&&action==="explain"?<><Spinner/>&nbsp;Explaining…</>:"💡 Explain"}
        </button>
        <button 
          onClick={() => setSaveItem({
            type: "code",
            title: "Code: " + lang.toUpperCase() + " snippet",
            content: { code, lang }
          })}
          style={{ padding:"7px 12px", borderRadius:7, border:"none", background:"#312e81", color:"#e2e8f0", fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}
        >
          <i className="ti ti-folder-plus"></i> Save
        </button>
        <button onClick={()=>{setCode(STARTERS[lang]||"");setOutput(null);setAiPanel(null);setError("");}} style={{ padding:"7px 12px", borderRadius:7, border:"1px solid #3d3f60", background:"transparent", color:"#94a3b8", fontSize:13, cursor:"pointer" }}>Reset</button>
      </div>

      {/* Editor area */}
      <div style={{ display:"flex", background:"#1a1b2e", overflow:"hidden", position:"relative" }}>
        {/* Line numbers */}
        <div ref={lineBoxRef} style={{ overflowY:"hidden", flexShrink:0, background:"#13141f", borderRight:"1px solid #2d2f50", padding:"14px 6px 14px 8px", fontFamily:"'JetBrains Mono','Fira Code','Cascadia Code',monospace", fontSize:12.5, lineHeight:"1.65", color:"#4a5568", textAlign:"right", userSelect:"none", minWidth:36 }}>
          {Array.from({ length: lines }, (_, i) => <div key={i}>{i + 1}</div>)}
        </div>
        {/* Code textarea */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={e => setCode(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          style={{ flex:1, minHeight:320, resize:"none", border:"none", outline:"none", background:"transparent", color:"#e2e8f0", fontFamily:"'JetBrains Mono','Fira Code','Cascadia Code',monospace", fontSize:13, lineHeight:"1.65", padding:"14px 16px", overflowY:"auto" }}
        />
      </div>

      {/* HTML preview */}
      {output?.type === "html" && (
        <div>
          <div style={{ padding:"8px 14px", background:"#0f172a", borderTop:"1px solid #2d2f50", fontSize:11, color:"#94a3b8", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>🌐 Live Preview</div>
          <iframe
            ref={iframeRef}
            srcDoc={code}
            sandbox="allow-scripts allow-same-origin"
            style={{ width:"100%", height:280, border:"none", borderBottom:"1px solid #e2e8f0" }}
            title="HTML Preview"
          />
        </div>
      )}

      {/* JS runtime output */}
      {output && output.type !== "html" && (
        <div style={{ background:"#0d1117", borderTop:"1px solid #2d2f50" }}>
          <div style={{ padding:"8px 14px 6px", fontSize:11, color: output.type==="success"?"#22c55e":"#f87171", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>
            {output.type==="success"?"▶ Output":"⚠ Runtime Error"}
          </div>
          <pre style={{ margin:0, padding:"0 14px 14px", fontFamily:"'JetBrains Mono','Fira Code',monospace", fontSize:12.5, lineHeight:1.7, color: output.type==="success"?"#e2e8f0":"#f87171", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
            {output.text || ""}
            {output.error && <span style={{ color:"#f87171", display:"block", marginTop:4 }}>{output.error}</span>}
          </pre>
        </div>
      )}

      {/* AI panel (debug / explain / simulated run) */}
      {aiPanel && (
        <div style={{ background:"#f8fafc", borderTop:"1px solid #e2e8f0" }}>
          <div style={{ padding:"10px 14px 6px", fontSize:11, fontWeight:700, color: aiPanel.type==="debug"?"#ea580c":aiPanel.type==="explain"?"#6366f1":"#16a34a", textTransform:"uppercase", letterSpacing:"0.07em", display:"flex", alignItems:"center", justifyValue:"space-between", justifyContent:"space-between" }}>
            <span>{panelLabels[aiPanel.type]}</span>
            <button onClick={()=>setAiPanel(null)} style={{ background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:16, lineHeight:1 }}>×</button>
          </div>
          <div style={{ padding:"4px 14px 14px", fontSize:13.5, lineHeight:1.8, color:"#1e293b", whiteSpace:"pre-wrap", maxHeight:360, overflowY:"auto" }}>
            {aiPanel.content}
          </div>
        </div>
      )}

      {/* Error */}
      {error && <div style={{ padding:"10px 14px" }}><ErrorBox msg={error}/></div>}

      {/* Status bar */}
      <div style={{ padding:"5px 14px", background:"#13141f", display:"flex", alignItems:"center", gap:16, fontSize:11, color:"#4a5568" }}>
        <span>{currentLang.icon} {currentLang.label}</span>
        <span>Lines: {lines}</span>
        <span>Chars: {code.length}</span>
        {currentLang.canRun
          ? <span style={{ color:"#22c55e" }}>● Live execution</span>
          : <span style={{ color:"#f59e0b" }}>● AI-simulated execution</span>}
      </div>

      {saveItem && (
        <SaveToFolderModal 
          folders={folders} 
          addFolder={addFolder} 
          addItemToFolder={addItemToFolder} 
          item={saveItem} 
          onClose={() => setSaveItem(null)} 
        />
      )}
    </div>
  );
}

// ── FOLDERS TAB COMPONENT ─────────────────────────────────────────────────────
function FoldersTab({ folders, setFolders, addFolder, deleteFolder, deleteItemFromFolder }) {
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [activeItemId, setActiveItemId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [copiedFolderId, setCopiedFolderId] = useState(null);
  const [showImportCodeModal, setShowImportCodeModal] = useState(false);
  const [importCodeText, setImportCodeText] = useState("");
  const [importError, setImportError] = useState("");

  const activeFolder = folders.find(f => f.id === activeFolderId);
  const activeItem = activeFolder?.items.find(i => i.id === activeItemId);

  // Export folder as JSON file
  function exportFolder(folder) {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(folder));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${folder.name.toLowerCase().replace(/\s+/g, '_')}_study_folder.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      alert("Failed to export folder");
    }
  }

  // Import folder from JSON file
  function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (parsed && typeof parsed.name === "string" && Array.isArray(parsed.items)) {
          const imported = {
            id: "f_" + Date.now() + "_" + Math.random().toString(36).substring(2, 11),
            name: parsed.name + " (Imported)",
            createdAt: new Date().toISOString(),
            items: parsed.items.map(item => ({
              ...item,
              id: "i_" + Date.now() + "_" + Math.random().toString(36).substring(2, 11),
              timestamp: new Date().toISOString()
            }))
          };
          setFolders(prev => [imported, ...prev]);
        } else {
          alert("Invalid study folder file structure.");
        }
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
  }

  // Generate shareable link
  function shareFolder(folder) {
    const code = encodeFolderForUrl(folder);
    if (!code) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?share=${code}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedFolderId(folder.id);
      setTimeout(() => setCopiedFolderId(null), 2000);
    });
  }

  // Get item type labels and icons
  const itemMeta = {
    chat:       { label: "AI Tutor Chat", icon: "ti ti-message-chatbot", color: "#6366f1" },
    code:       { label: "Code Snippet",  icon: "ti ti-code",            color: "#3b82f6" },
    pdf:        { label: "PDF Study Deck",icon: "ti ti-file-text",       color: "#10b981" },
    summary:    { label: "Summary Notes", icon: "ti ti-notes",           color: "#ec4899" },
    quiz:       { label: "Practice Quiz", icon: "ti ti-help",            color: "#f59e0b" },
    flashcards: { label: "Flashcards",    icon: "ti ti-cards",           color: "#8b5cf6" },
    planner:    { label: "Study Plan",    icon: "ti ti-calendar",        color: "#14b8a6" }
  };

  return (
    <div style={{ padding: "1.5rem" }}>
      {/* 1. MAIN FOLDER LIST VIEW */}
      {activeFolderId === null && (
        <div>
          {/* Header controls */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
            <div>
              <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:"#1e293b" }}>Study Folders</h2>
              <p style={{ margin:"4px 0 0", fontSize:13, color:"#64748b" }}>Manage and share your study materials</p>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button 
                onClick={() => setShowCreateModal(true)}
                style={{ padding:"9px 15px", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:600, fontSize:13, display:"flex", alignItems:"center", gap:5 }}
              >
                <i className="ti ti-folder-plus"></i> Create Folder
              </button>
              
              <label style={{ padding:"9px 15px", background:"transparent", color:"#64748b", border:"1px solid #e2e8f0", borderRadius:10, cursor:"pointer", fontWeight:600, fontSize:13, display:"flex", alignItems:"center", gap:5 }}>
                <input type="file" accept=".json" onChange={handleImportFile} style={{ display:"none" }} />
                <i className="ti ti-upload"></i> Import Folder
              </label>

              <button 
                onClick={() => setShowImportCodeModal(true)}
                style={{ padding:"9px 15px", background:"transparent", color:"#64748b", border:"1px solid #e2e8f0", borderRadius:10, cursor:"pointer", fontWeight:600, fontSize:13, display:"flex", alignItems:"center", gap:5 }}
              >
                <i className="ti ti-link"></i> Paste Share URL
              </button>
            </div>
          </div>

          {/* Folders grid */}
          {folders.length === 0 ? (
            <div style={{ padding:"60px 20px", border:"2px dashed #e2e8f0", borderRadius:16, textAlign:"center", background:"#f8fafc" }}>
              <div style={{ width:60, height:60, borderRadius:"50%", background:"rgba(99,102,241,0.08)", display:"flex", alignItems:"center", justifyContent: "center", margin:"0 auto 16px" }}>
                <i className="ti ti-folder" style={{ color:"#6366f1", fontSize:28 }}></i>
              </div>
              <h3 style={{ margin:0, color:"#1e293b", fontSize:16, fontWeight:600 }}>No Study Folders Yet</h3>
              <p style={{ margin:"6px 0 16px", color:"#64748b", fontSize:13, maxWidth:320, marginLeft:"auto", marginRight:"auto" }}>Create a folder to organize notes, summaries, and interactive quizzes, or share study materials with friends.</p>
              <Btn onClick={() => setShowCreateModal(true)}>Create First Folder</Btn>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:16 }}>
              {folders.map(f => (
                <div 
                  key={f.id} 
                  style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:18, display:"flex", flexDirection:"column", justifyContent:"space-between", position:"relative", transition:"transform 0.2s, box-shadow 0.2s", cursor:"pointer", boxShadow:"0 2px 4px rgba(0,0,0,0.02)" }}
                  onMouseEnter={e => { e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 10px 20px rgba(0,0,0,0.05)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="0 2px 4px rgba(0,0,0,0.02)"; }}
                  onClick={() => setActiveFolderId(f.id)}
                >
                  <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:16 }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:"rgba(99,102,241,0.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <i className="ti ti-folder" style={{ color:"#6366f1", fontSize:20 }}></i>
                    </div>
                    <div>
                      <h4 style={{ margin:0, color:"#1e293b", fontSize:15, fontWeight:600, wordBreak:"break-all" }}>{f.name}</h4>
                      <span style={{ fontSize:12, color:"#64748b", marginTop:3, display:"block" }}>{f.items?.length || 0} study assets</span>
                    </div>
                  </div>

                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:"1px solid #f1f5f9", paddingTop:12, marginTop:4 }}>
                    <span style={{ fontSize:11, color:"#94a3b8" }}>Created {new Date(f.createdAt).toLocaleDateString()}</span>
                    
                    {/* Action buttons (stop propagation so card click is not triggered) */}
                    <div style={{ display:"flex", gap:4 }} onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => shareFolder(f)}
                        title="Copy Shareable URL"
                        style={{ width:28, height:28, borderRadius:6, background:"#f1f5f9", border:"none", color:"#475569", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0 }}
                      >
                        <i className={copiedFolderId === f.id ? "ti ti-check" : "ti ti-share"} style={{ color: copiedFolderId === f.id ? "#16a34a" : "#475569" }}></i>
                      </button>
                      
                      <button 
                        onClick={() => exportFolder(f)}
                        title="Export JSON File"
                        style={{ width:28, height:28, borderRadius:6, background:"#f1f5f9", border:"none", color:"#475569", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0 }}
                      >
                        <i className="ti ti-download"></i>
                      </button>

                      <button 
                        onClick={() => { if(confirm(`Delete folder "${f.name}"? This cannot be undone.`)) deleteFolder(f.id); }}
                        title="Delete Folder"
                        style={{ width:28, height:28, borderRadius:6, background:"#fef2f2", border:"none", color:"#dc2626", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0 }}
                      >
                        <i className="ti ti-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. FOLDER CONTENTS VIEW */}
      {activeFolderId !== null && activeFolder && (
        <div>
          {/* Back link */}
          <button 
            onClick={() => setActiveFolderId(null)}
            style={{ background:"none", border:"none", color:"#6366f1", fontWeight:600, fontSize:13, display:"flex", alignItems:"center", gap:4, cursor:"pointer", padding:0, marginBottom:16, boxShadow:"none" }}
          >
            <i className="ti ti-chevron-left"></i> Back to Folder List
          </button>

          {/* Folder details header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, borderBottom:"1px solid #e2e8f0", paddingBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:"rgba(99,102,241,0.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <i className="ti ti-folder-open" style={{ color:"#6366f1", fontSize:22 }}></i>
              </div>
              <div>
                <h3 style={{ margin:0, fontSize:18, fontWeight:700, color:"#1e293b" }}>{activeFolder.name}</h3>
                <span style={{ fontSize:12, color:"#64748b" }}>{activeFolder.items.length} items inside</span>
              </div>
            </div>

            <div style={{ display:"flex", gap:8 }}>
              <button 
                onClick={() => shareFolder(activeFolder)}
                style={{ padding:"7px 12px", background:"#ede9fe", color:"#6366f1", border:"none", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}
              >
                <i className={copiedFolderId === activeFolder.id ? "ti ti-check" : "ti ti-share"}></i>
                {copiedFolderId === activeFolder.id ? "Link Copied!" : "Copy Share Link"}
              </button>
              
              <button 
                onClick={() => exportFolder(activeFolder)}
                style={{ padding:"7px 12px", background:"#f1f5f9", color:"#475569", border:"none", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}
              >
                <i className="ti ti-download"></i> Export Folder
              </button>
            </div>
          </div>

          {/* Item List */}
          {activeFolder.items.length === 0 ? (
            <div style={{ padding:"40px 20px", textAlign:"center", color:"#64748b" }}>
              <i className="ti ti-box-multiple" style={{ fontSize:36, color:"#94a3b8", marginBottom:10, display:"block" }}></i>
              <p style={{ margin:0, fontSize:14 }}>Folder is currently empty.</p>
              <p style={{ margin:"4px 0 0", fontSize:12, color:"#94a3b8" }}>Go to other tabs (e.g. AI Tutor, Summarizer, Quiz) and click <strong>"Save to Folder"</strong>.</p>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {activeFolder.items.map(item => {
                const meta = itemMeta[item.type] || { label:"Study Material", icon:"ti ti-file", color:"#64748b" };
                return (
                  <div 
                    key={item.id} 
                    style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", transition:"background 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.background="#f1f5f9"}
                    onMouseLeave={e => e.currentTarget.style.background="#f8fafc"}
                  >
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:36, height:36, borderRadius:8, background:`rgba(${item.type === 'chat' ? '99,102,241' : item.type === 'code' ? '59,130,246' : '16,185,129'}, 0.1)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <i className={meta.icon} style={{ color: meta.color, fontSize:18 }}></i>
                      </div>
                      <div>
                        <h5 style={{ margin:0, fontSize:14, fontWeight:600, color:"#1e293b" }}>{item.title}</h5>
                        <div style={{ display:"flex", gap:10, alignItems:"center", marginTop:3 }}>
                          <span style={{ fontSize:11, background:`rgba(${item.type === 'chat' ? '99,102,241' : '16,185,129'}, 0.08)`, color: meta.color, padding:"2px 6px", borderRadius:4, fontWeight:600 }}>{meta.label}</span>
                          <span style={{ fontSize:11, color:"#94a3b8" }}>{new Date(item.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display:"flex", gap:6 }}>
                      <button 
                        onClick={() => setActiveItemId(item.id)}
                        style={{ padding:"6px 12px", background:"#ede9fe", color:"#6366f1", border:"none", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}
                      >
                        <i className="ti ti-book-open"></i> Study
                      </button>
                      <button 
                        onClick={() => { if(confirm(`Delete "${item.title}"?`)) deleteItemFromFolder(activeFolder.id, item.id); }}
                        style={{ width:30, height:30, borderRadius:8, background:"#fef2f2", border:"none", color:"#dc2626", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0 }}
                      >
                        <i className="ti ti-trash"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. ITEM INSPECTOR MODAL VIEW */}
      {activeItemId !== null && activeItem && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(11,12,16,0.85)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }}>
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, width:"100%", maxWidth:640, maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 50px rgba(0,0,0,0.15)", overflow:"hidden", color:"#1e293b" }}>
            
            {/* Modal Header */}
            <div style={{ padding:"16px 20px", borderBottom:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <i className={itemMeta[activeItem.type]?.icon} style={{ color: itemMeta[activeItem.type]?.color, fontSize:20 }}></i>
                <h4 style={{ margin:0, fontSize:16, fontWeight:700, color:"#1e293b", maxWidth:440, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{activeItem.title}</h4>
              </div>
              <button onClick={() => setActiveItemId(null)} style={{ background:"none", border:"none", color:"#94a3b8", fontSize:24, cursor:"pointer", padding:0, boxShadow:"none", width:30, height:30, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
            </div>

            {/* Modal Body */}
            <div style={{ padding:20, overflowY:"auto", flex:1, fontSize:14, lineHeight:1.65 }}>
              {activeItem.type === "chat" && renderChat(activeItem.content)}
              {activeItem.type === "code" && renderCode(activeItem.content)}
              {activeItem.type === "summary" && renderSummary(activeItem.content)}
              {activeItem.type === "pdf" && renderPDF(activeItem.content)}
              {activeItem.type === "quiz" && <InspectorQuiz content={activeItem.content} />}
              {activeItem.type === "flashcards" && <InspectorFlashcards content={activeItem.content} />}
              {activeItem.type === "planner" && renderPlanner(activeItem.content)}
            </div>

            {/* Modal Footer */}
            <div style={{ padding:"12px 20px", background:"#f8fafc", borderTop:"1px solid #f1f5f9", display:"flex", justifyContent:"flex-end" }}>
              <button 
                onClick={() => setActiveItemId(null)} 
                style={{ padding:"8px 16px", background:"linear-gradient(135deg,#6366f1,#4f46e5)", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:13 }}
              >
                Close Inspector
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── CREATE FOLDER MODAL ── */}
      {showCreateModal && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(11,12,16,0.8)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }}>
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:24, width:"100%", maxWidth:380, boxShadow:"0 15px 35px rgba(0,0,0,0.15)" }}>
            <h4 style={{ margin:"0 0 16px", color:"#1e293b", fontSize:16, fontWeight:700 }}>Create New Folder</h4>
            <input 
              value={newFolderName} 
              onChange={e => setNewFolderName(e.target.value)} 
              placeholder="e.g. Science Revision, Midterm Quiz..." 
              style={{ width:"100%", padding:"10px 12px", border:"1px solid #e2e8f0", borderRadius:8, color:"#1e293b", fontSize:13, boxSizing:"border-box", outline:"none" }}
            />
            <div style={{ display:"flex", gap:10, marginTop:18 }}>
              <button 
                onClick={() => { setShowCreateModal(false); setNewFolderName(""); }}
                style={{ flex:1, background:"transparent", border:"1px solid #e2e8f0", color:"#64748b", padding:10, borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer", boxShadow:"none" }}
              >
                Cancel
              </button>
              <button 
                onClick={() => { if(newFolderName.trim()) { addFolder(newFolderName); setShowCreateModal(false); setNewFolderName(""); } }}
                style={{ flex:1, background:"linear-gradient(135deg, #6366f1, #4f46e5)", color:"#fff", padding:10, borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", border:"none" }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── IMPORT SHARE CODE MODAL ── */}
      {showImportCodeModal && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(11,12,16,0.8)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }}>
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:24, width:"100%", maxWidth:420, boxShadow:"0 15px 35px rgba(0,0,0,0.15)" }}>
            <h4 style={{ margin:"0 0 10px", color:"#1e293b", fontSize:16, fontWeight:700 }}>Paste Share Code / Link</h4>
            <p style={{ margin:"0 0 14px", fontSize:12, color:"#64748b" }}>Paste the base64 share code or the full share link below to import the shared folder.</p>
            
            <textarea 
              value={importCodeText} 
              onChange={e => setImportCodeText(e.target.value)} 
              placeholder="Paste link or share code here..." 
              rows={4}
              style={{ width:"100%", padding:"10px 12px", border:"1px solid #e2e8f0", borderRadius:8, color:"#1e293b", fontSize:12, boxSizing:"border-box", outline:"none", resize:"none" }}
            />
            {importError && <div style={{ color:"#dc2626", fontSize:12, marginTop:6 }}>⚠ {importError}</div>}
            
            <div style={{ display:"flex", gap:10, marginTop:18 }}>
              <button 
                onClick={() => { setShowImportCodeModal(false); setImportCodeText(""); setImportError(""); }}
                style={{ flex:1, background:"transparent", border:"1px solid #e2e8f0", color:"#64748b", padding:10, borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer", boxShadow:"none" }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  let text = importCodeText.trim();
                  if (text.includes("?share=")) {
                    text = text.split("?share=")[1];
                  }
                  if(text) {
                    const decoded = decodeFolderFromUrl(text);
                    if (decoded) {
                      setFolders(prev => [decoded, ...prev]);
                      setShowImportCodeModal(false);
                      setImportCodeText("");
                      setImportError("");
                    } else {
                      setImportError("Failed to parse the share code. Invalid format.");
                    }
                  } else {
                    setImportError("Please enter a valid share code or link.");
                  }
                }}
                style={{ flex:1, background:"linear-gradient(135deg, #6366f1, #4f46e5)", color:"#fff", padding:10, borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", border:"none" }}
              >
                Import Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── INTERNAL ITEM RENDERERS ──
function renderChat(messages) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10, background:"#f1f5f9", padding:16, borderRadius:12, maxHeight:400, overflowY:"auto" }}>
      {messages.map((m, i) => (
        <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
          {m.role==="assistant" && <div style={{ width:24,height:24,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,marginRight:6,flexShrink:0 }}>🤖</div>}
          <div style={{ maxWidth:"80%", padding:"8px 12px", fontSize:13, lineHeight:1.5, whiteSpace:"pre-wrap", borderRadius:m.role==="user"?"14px 14px 2px 14px":"14px 14px 14px 2px", background:m.role==="user"?"linear-gradient(135deg,#6366f1,#8b5cf6)":"#fff", color:m.role==="user"?"#fff":"#1e293b", border:m.role==="user"?"none":"1px solid #e2e8f0", textAlign:"left" }}>{m.content}</div>
        </div>
      ))}
    </div>
  );
}

function renderCode(content) {
  const { code, lang } = content;
  return (
    <div style={{ background:"#1a1b2e", borderRadius:12, overflow:"hidden", border:"1px solid #2d2f50" }}>
      <div style={{ padding:"6px 12px", background:"#13141f", display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:11, color:"#94a3b8" }}>
        <span>{lang?.toUpperCase()}</span>
        <button 
          onClick={() => navigator.clipboard.writeText(code)} 
          style={{ background:"none", border:"none", color:"#818cf8", fontSize:11, cursor:"pointer", padding:0, boxShadow:"none", display:"flex", alignItems:"center", gap:3 }}
        >
          <i className="ti ti-copy"></i> Copy
        </button>
      </div>
      <pre style={{ margin:0, padding:14, overflowX:"auto", fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:"#e2e8f0", lineHeight:1.5, textAlign:"left" }}>{code}</pre>
    </div>
  );
}

function renderSummary(content) {
  const { text, result } = content;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12, padding:14, textAlign:"left" }}>
        <p style={{ margin:"0 0 6px", fontSize:11, fontWeight:600, color:"#94a3b8" }}>GENERATED SUMMARY</p>
        <div style={{ fontSize:13, lineHeight:1.6, color:"#1e293b", whiteSpace:"pre-wrap" }}>{result}</div>
      </div>
      <details style={{ cursor:"pointer", textAlign:"left" }}>
        <summary style={{ fontSize:12, color:"#6366f1", fontWeight:500, outline:"none" }}>View Original Text Source</summary>
        <div style={{ marginTop:8, padding:12, background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, fontSize:12, color:"#475569", maxHeight:180, overflowY:"auto", whiteSpace:"pre-wrap", cursor:"auto" }}>{text}</div>
      </details>
    </div>
  );
}

function renderPDF(content) {
  const { docText, fileName } = content;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", padding:12, borderRadius:12, display:"flex", alignItems:"center", gap:8, color:"#16a34a", fontSize:13, textAlign:"left" }}>
        <i className="ti ti-file-text" style={{ fontSize:20 }}></i>
        <div>
          <strong>{fileName}</strong>
          <div style={{ fontSize:11, color:"#16a34a", opacity:0.8 }}>Extracted PDF Study Deck</div>
        </div>
      </div>
      <details style={{ cursor:"pointer", textAlign:"left" }}>
        <summary style={{ fontSize:12, color:"#6366f1", fontWeight:500, outline:"none" }}>View Extracted PDF Text Source</summary>
        <div style={{ marginTop:8, padding:12, background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, fontSize:12, color:"#475569", maxHeight:200, overflowY:"auto", whiteSpace:"pre-wrap", cursor:"auto" }}>{docText}</div>
      </details>
    </div>
  );
}

function InspectorQuiz({ content }) {
  const { questions, topic } = content;
  const [localAnswers, setLocalAnswers] = useState({});
  const [localRevealed, setLocalRevealed] = useState({});
  const [localScore, setLocalScore] = useState(null);

  function checkAll() {
    let score = 0;
    questions.forEach((q, i) => {
      const ca = (q.answer || "").replace(/^\*/,"").trim().toLowerCase();
      const ua = (localAnswers[i] || "").replace(/^\*/,"").trim().toLowerCase();
      if (ua === ca) score++;
    });
    setLocalScore(score);
    const rev = {};
    questions.forEach((_, i) => { rev[i] = true; });
    setLocalRevealed(rev);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ padding:"8px 12px", background:"#ede9fe", borderRadius:8, fontSize:12, color:"#6366f1", fontWeight:600, textAlign:"left" }}>Quiz Topic: {topic}</div>
      {localScore !== null && (
        <div style={{ padding:10, background:"#f0fdf4", border:"1px solid #bbf7d0", color:"#16a34a", borderRadius:8, textAlign:"center", fontWeight:600, fontSize:13 }}>
          Score: {localScore} / {questions.length} ({Math.round(localScore / questions.length * 100)}%)
        </div>
      )}
      {questions.map((q, i) => {
        const ca = (q.answer || "").replace(/^\*/,"").trim();
        const ua = (localAnswers[i] || "").replace(/^\*/,"").trim();
        const ok = ua.toLowerCase() === ca.toLowerCase();
        return (
          <div key={i} style={{ border:"1px solid #e2e8f0", borderRadius:10, padding:12, background:"#f8fafc", textAlign:"left" }}>
            <p style={{ margin:"0 0 10px", fontSize:13, fontWeight:600, color:"#1e293b" }}>{i+1}. {q.q}</p>
            {q.options ? (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {q.options.map((opt, j) => {
                  const oc = opt.replace(/^\*/,"").trim();
                  const ico = opt.startsWith("*");
                  const isSel = ua === oc;
                  let bg = "#fff", border = "1px solid #e2e8f0", color = "#334155";
                  if (localRevealed[i]) {
                    if (ico) { bg = "#f0fdf4"; border = "1px solid #86efac"; color = "#16a34a"; }
                    else if (isSel && !ico) { bg = "#fef2f2"; border = "1px solid #fca5a5"; color = "#dc2626"; }
                  } else if (isSel) { bg = "#ede9fe"; border = "1px solid #a5b4fc"; color = "#6366f1"; }
                  return (
                    <div key={j} onClick={() => !localRevealed[i] && setLocalAnswers(a => ({...a, [i]:oc}))} style={{ padding:"6px 10px", borderRadius:6, background:bg, border, color, fontSize:12, cursor:localRevealed[i]?"default":"pointer" }}>{oc}</div>
                  );
                })}
              </div>
            ) : (
              <input value={localAnswers[i] || ""} onChange={e => setLocalAnswers(a => ({...a, [i]:e.target.value}))} disabled={localRevealed[i]} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #e2e8f0", fontSize:12, background:"#fff", color:"#1e293b", boxSizing:"border-box" }} />
            )}
            {localRevealed[i] && (
              <div style={{ marginTop:8, fontSize:11, color:"#64748b" }}>
                {ok ? <span style={{ color:"#16a34a", fontWeight:600 }}>✓ Correct: </span> : <span style={{ color:"#dc2626", fontWeight:600 }}>✗ Answer: "{ca}": </span>}
                {q.explanation}
              </div>
            )}
          </div>
        );
      })}
      {questions.length > 0 && localScore === null && <button onClick={checkAll} style={{ padding:"8px 16px", background:"linear-gradient(135deg, #6366f1, #4f46e5)", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600 }}>Submit Answers</button>}
    </div>
  );
}

function InspectorFlashcards({ content }) {
  const { cards, topic } = content;
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[idx];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ padding:"8px 12px", background:"#ede9fe", borderRadius:8, fontSize:12, color:"#6366f1", fontWeight:600, textAlign:"left" }}>Flashcards: {topic}</div>
      <div style={{ fontSize:12, color:"#64748b", textAlign:"center" }}>Card {idx+1} of {cards.length}</div>
      <div onClick={() => setFlipped(!flipped)} style={{ minHeight:150, borderRadius:12, border:`2px dashed ${flipped?"#a5b4fc":"#e2e8f0"}`, background:flipped?"#f5f3ff":"#f8fafc", display:"flex", alignItems:"center", justifyContent:"center", padding:20, cursor:"pointer", textAlign:"center" }}>
        <div>
          <p style={{ margin:"0 0 8px", fontSize:9, fontWeight:700, color:"#94a3b8", textTransform:"uppercase" }}>{flipped?"Answer":"Tap to Flip"}</p>
          <p style={{ margin:0, fontSize:16, fontWeight:600, color:"#1e293b", lineHeight:1.4 }}>{flipped?card.back:card.front}</p>
        </div>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={() => { setFlipped(false); setIdx(i => (i - 1 + cards.length) % cards.length); }} style={{ flex:1, padding:8, borderRadius:8, background:"#2d2f3d", color:"#f3f4f6", border:"none", cursor:"pointer", fontSize:12 }}>Previous</button>
        <button onClick={() => { setFlipped(false); setIdx(i => (i + 1) % cards.length); }} style={{ flex:1, padding:8, borderRadius:8, background:"#2d2f3d", color:"#f3f4f6", border:"none", cursor:"pointer", fontSize:12 }}>Next</button>
      </div>
    </div>
  );
}

function renderPlanner(content) {
  const { plan, subject } = content;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ padding:"8px 12px", background:"#ede9fe", borderRadius:8, fontSize:12, color:"#6366f1", fontWeight:600, textAlign:"left" }}>Plan for {subject}</div>
      <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12, padding:14, fontSize:13, lineHeight:1.7, color:"#1e293b", whiteSpace:"pre-wrap", textAlign:"left", maxHeight:400, overflowY:"auto" }}>{plan}</div>
    </div>
  );
}

// ── TABS + APP ─────────────────────────────────────────────────────────────────

function App() {
  const [folders, setFolders] = useState(() => {
    try {
      const saved = localStorage.getItem("study_assistant_folders");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [sharedImportFolder, setSharedImportFolder] = useState(null);

  useEffect(() => {
    localStorage.setItem("study_assistant_folders", JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareCode = params.get("share");
    if (shareCode) {
      const decoded = decodeFolderFromUrl(shareCode);
      if (decoded) {
        setSharedImportFolder(decoded);
      }
    }
  }, []);

  function addFolder(name) {
    const newFolder = {
      id: "f_" + Date.now() + "_" + Math.random().toString(36).substring(2, 11),
      name: name.trim(),
      createdAt: new Date().toISOString(),
      items: []
    };
    setFolders(prev => [newFolder, ...prev]);
    return newFolder;
  }

  function deleteFolder(folderId) {
    setFolders(prev => prev.filter(f => f.id !== folderId));
  }

  function addItemToFolder(folderId, item) {
    setFolders(prev => prev.map(f => {
      if (f.id === folderId) {
        return {
          ...f,
          items: [
            {
              ...item,
              id: "i_" + Date.now() + "_" + Math.random().toString(36).substring(2, 11),
              timestamp: new Date().toISOString()
            },
            ...f.items
          ]
        };
      }
      return f;
    }));
  }

  function deleteItemFromFolder(folderId, itemId) {
    setFolders(prev => prev.map(f => {
      if (f.id === folderId) {
        return {
          ...f,
          items: f.items.filter(item => item.id !== itemId)
        };
      }
      return f;
    }));
  }

  const TABS = [
    { id:"chat",       icon:"🤖", label:"AI Tutor",    comp:ChatTutor     },
    { id:"code",       icon:"💻", label:"Code Editor", comp:CodeEditor    },
    { id:"upload",     icon:"📄", label:"PDF Q&A",     comp:PDFQnA        },
    { id:"summarize",  icon:"📝", label:"Summarizer",  comp:Summarizer    },
    { id:"quiz",       icon:"❓", label:"Quiz",        comp:QuizGenerator },
    { id:"flashcards", icon:"🃏", label:"Flashcards",  comp:Flashcards    },
    { id:"planner",    icon:"📅", label:"Planner",     comp:StudyPlanner  },
    { id:"folders",    icon:"📂", label:"Study Folders", comp:FoldersTab    },
  ];
  const [tab, setTab] = useState("chat");
  const Active = TABS.find(t => t.id === tab)?.comp || ChatTutor;
  const isCode = tab === "code";

  return (
    <div style={{ fontFamily:"'Outfit',system-ui,sans-serif", maxWidth:860, margin:"0 auto", paddingBottom:40 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}input:focus,select:focus,textarea:focus{outline:2px solid #6366f1!important;border-color:#6366f1!important}button:active{transform:scale(0.97)}*{box-sizing:border-box}`}</style>

      <div style={{ padding:"1.25rem 1rem 0" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🧠</div>
          <div>
            <h1 style={{ margin:0, fontSize:20, fontWeight:700, color:"#1e293b" }}>AI Study Assistant</h1>
            <p style={{ margin:0, fontSize:12, color:"#94a3b8" }}>Tutor · Code · Quiz · Flashcards · Planner</p>
          </div>
        </div>
        <div style={{ display:"flex", gap:2, marginTop:14, overflowX:"auto", borderBottom:"1px solid #e2e8f0" }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:"8px 13px", fontSize:13, background:"transparent", border:"none", borderBottom:tab===t.id?"2px solid #6366f1":"2px solid transparent", color:tab===t.id?"#6366f1":"#64748b", fontWeight:tab===t.id?600:400, cursor:"pointer", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:5, transition:"color 0.15s" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ border:"1px solid #e2e8f0", borderTop:"none", borderRadius:"0 0 14px 14px", background: isCode?"#1a1b2e":"#fff", overflow:"hidden", minHeight:200 }}>
        <Active 
          folders={folders} 
          setFolders={setFolders} 
          addFolder={addFolder} 
          deleteFolder={deleteFolder} 
          addItemToFolder={addItemToFolder} 
          deleteItemFromFolder={deleteItemFromFolder} 
        />
      </div>

      {/* Shared folder import request dialog */}
      {sharedImportFolder && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(11,12,16,0.85)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1001, padding:20 }}>
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:24, width:"100%", maxWidth:460, boxShadow:"0 20px 50px rgba(0,0,0,0.15)", color:"#1e293b", textAlign:"center", fontFamily:"'Outfit',sans-serif" }}>
            <div style={{ width:56, height:56, borderRadius:"50%", background:"rgba(99,102,241,0.1)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <i className="ti ti-folder-open" style={{ color:"#6366f1", fontSize:26 }}></i>
            </div>
            <h3 style={{ margin:"0 0 8px", fontSize:18, fontWeight:700 }}>Import Shared Folder</h3>
            <p style={{ margin:"0 0 16px", fontSize:13, color:"#64748b" }}>You received a shared study folder: <strong style={{ color:"#1e293b" }}>"{sharedImportFolder.name}"</strong> with {sharedImportFolder.items?.length || 0} study items inside.</p>
            
            <div style={{ background:"#f8fafc", borderRadius:10, padding:12, maxHeight:150, overflowY:"auto", textAlign:"left", fontSize:12, border:"1px solid #e2e8f0", marginBottom:20 }}>
              {sharedImportFolder.items?.map((item, idx) => (
                <div key={idx} style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 0", borderBottom:idx < sharedImportFolder.items.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                  <span style={{ color:"#6366f1" }}>●</span>
                  <span style={{ fontWeight:500, color:"#475569" }}>{item.title}</span>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button 
                onClick={() => {
                  setSharedImportFolder(null);
                  const url = new URL(window.location);
                  url.searchParams.delete("share");
                  window.history.replaceState({}, document.title, url);
                }}
                style={{ flex:1, background:"transparent", border:"1px solid #e2e8f0", color:"#64748b", padding:10, borderRadius:10, fontSize:13, fontWeight:500, cursor:"pointer", boxShadow:"none" }}
              >
                Decline
              </button>
              <button 
                onClick={() => {
                  setFolders(prev => [sharedImportFolder, ...prev]);
                  setSharedImportFolder(null);
                  const url = new URL(window.location);
                  url.searchParams.delete("share");
                  window.history.replaceState({}, document.title, url);
                  setTab("folders");
                }}
                style={{ flex:1, background:"linear-gradient(135deg, #6366f1, #4f46e5)", color:"#fff", padding:10, borderRadius:10, fontSize:13, fontWeight:600, border:"none", cursor:"pointer" }}
              >
                Import Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Bind App component to the global window scope explicitly
window.App = App;

