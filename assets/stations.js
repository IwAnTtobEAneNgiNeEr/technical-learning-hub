'use strict';

// These renderers consume the hub's curated data/helpers; progress stays in core.js.
function skillURL(id,pid='',sid=''){
 const params=new URLSearchParams({id});
 if(has(P,pid)&&P[pid].sessions.some(s=>s.id===sid)){params.set('project',pid);params.set('s',sid);}
 return 'skill.html?'+params;
}
function teachingLink(r,compact=false){
 return `<article class="teaching-resource ${compact?'compact':''}"><span class="resource-kind">${esc(r.kind)}</span><a href="${esc(safeURL(r.url))}" target="_blank" rel="noopener noreferrer">${esc(r.title)}<span class="sr-only"> (mở tab mới)</span><span aria-hidden="true" class="external-mark">↗</span></a><p class="resource-section"><strong>Đúng phần:</strong> ${esc(r.section)}</p>${compact?'':`<p class="resource-task">${esc(r.task)}</p>`}</article>`;
}
function mechanismFlow(text){return `<div class="flow knowledge-flow" aria-label="Flow cơ chế">${esc(text)}</div>`;}
function coachPrompt({title,question,flow,essentials=[],resources=[],steps=[],context='',checkpoint='',practice=''}){
 const ideas=essentials.map(x=>`- ${x.title}: ${x.body}`).join('\n');
 const reading=resources.slice(0,3).map(r=>`- ${r.title} · ${r.section} · ${r.url}`).join('\n');
 const actionSteps=steps.map((x,i)=>`${i+1}. ${x}`).join('\n');
 const prompt=[
  'Bạn là AI đồng hành học tập xuyên suốt buổi này. Mục tiêu là giúp tôi tự làm và hiểu cơ chế, không làm thay.',
  'Trả lời bằng tiếng Việt, gọn. Đi từng bước, mỗi lượt chỉ hỏi một câu ngắn rồi chờ tôi. Để tôi dự đoán trước khi tiết lộ kết quả; nếu kẹt, cho gợi ý nhỏ rồi tăng dần. Nếu tôi xin lời giải, giải thích ngắn và giao một biến thể để tôi tự làm.',
  'Bám sát nội dung dưới đây. Khi tôi dán code/output, cùng trace input → state → output, chỉ ra điểm lệch và đề xuất kiểm tra nhỏ. Không khẳng định đã chạy thứ chưa chạy. Nhớ bước hiện tại, điều tôi đã chứng minh và điều đang vướng; cuối buổi kiểm tra tiêu chí đạt và giúp tôi ghi lại bài học cùng evidence.',
  `NỘI DUNG: ${title}`,
  context?`BỐI CẢNH: ${context}`:'',question?`MỤC TIÊU: ${question}`:'',flow?`FLOW: ${flow}`:'',
  ideas?`Ý TRỌNG YẾU:\n${ideas}`:'',reading?`LECTURE / TÀI LIỆU ĐÚNG PHẦN:\n${reading}`:'',
  practice?`BÀI THỬ: ${practice}`:'',actionSteps?`CÁC BƯỚC:\n${actionSteps}`:'',checkpoint?`TIÊU CHÍ ĐẠT: ${checkpoint}`:'',
  'Bắt đầu bằng một câu hỏi ngắn để tôi tự làm bước đầu tiên.'
 ].filter(Boolean).join('\n\n');
 return `<section class="study-coach" aria-labelledby="study-coach-title"><div class="study-coach-heading"><div><p class="eyebrow">PROMPT ĐÃ ĐIỀN THEO BUỔI HỌC</p><h2 id="study-coach-title">Cùng AI học nội dung này</h2><p>Agent đi từng bước, chờ bạn thử rồi mới gợi ý.</p></div><button class="primary" type="button" data-action="copy-study-prompt" aria-controls="study-coach-prompt">Copy prompt</button></div><details class="study-coach-details"><summary>Xem và sửa prompt</summary><textarea id="study-coach-prompt" rows="11" readonly spellcheck="false" aria-label="Prompt đồng hành đã điền sẵn">${esc(prompt)}</textarea></details><p id="study-coach-status" class="study-coach-status" role="status" aria-live="polite"></p></section>`;
}
async function copyStudyPrompt(button){
 const editor=$('study-coach-prompt'),details=editor.closest('details'),status=$('study-coach-status');
 try{if(!navigator.clipboard?.writeText)throw Error('clipboard unavailable');await navigator.clipboard.writeText(editor.value);status.textContent='Đã copy prompt · dán vào AI agent để bắt đầu.';}
 catch(e){details.open=true;editor.focus();editor.select();status.textContent='Prompt đã được chọn · nhấn Ctrl+C để copy.';}
}
function essentials(items,tag='h3'){
 return `<div class="essentials">${items.map(x=>`<div class="essential-item"><${tag}>${esc(x.title)}</${tag}><p>${esc(x.body)}</p></div>`).join('')}</div>`;
}
function sessionLearning(p,s){
 const primary=N[s.concepts[0]],learn=primary.learning;
 return `<section class="session-learning" aria-labelledby="session-knowledge-title"><div class="section-heading"><h3 id="session-knowledge-title">Kiến thức cho buổi này</h3>${link(skillURL(primary.id,p.id,s.id),'Flow và bài thử','quiet-link')}</div><div class="knowledge-tags">${s.concepts.map(id=>link(skillURL(id,p.id,s.id),N[id].title)).join('')}</div>${essentials(learn.essentials,'h4')}${teachingLink(learn.resources[0],true)}<p class="learning-tip">Dự đoán trước khi chạy. Chỉ mở đúng phần để trả lời câu hỏi của bước đang làm.</p></section>`;
}
function sessionCoach(p,s,mode){
 const concepts=s.concepts.map(id=>N[id]);
 const resources=s.sources.map(id=>R[id]).filter(Boolean).map(r=>({title:r.name,section:r.entry,url:r.reading||r.url}));
 return coachPrompt({title:`${p.title} · ${s.id.toUpperCase()} · ${s.title}`,context:`Project: ${p.title}. Thời lượng: ${record(p.id,s.id).minutes} phút.`,question:s.goal,flow:s.flow,essentials:concepts.map(n=>n.learning.essentials[0]),resources,steps:mode.actions,practice:s.test,checkpoint:mode.proof});
}
function workedGuide(guide){
 if(!guide)return '';
 return `<section class="worked-guide"><h3>${esc(guide.question)}</h3><pre><code>${esc(guide.fixture)}</code></pre><p>${esc(guide.explanation)}</p><details><summary>Tự thử và gợi ý</summary><p>${esc(guide.transfer)}</p><p>${esc(guide.hint)}</p></details></section>`;
}
function practiceStation(practice){
 return `<section class="station-section practice-station"><h2>Làm thử</h2><h3>${esc(practice.title)}</h3><p class="practice-setup">${esc(practice.setup)}</p><ol class="practice-steps">${practice.steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><a class="practice-venue secondary" href="${esc(safeURL(practice.venue.url))}" target="_blank" rel="noopener noreferrer">Mở nơi thực hành: ${esc(practice.venue.title)}<span class="sr-only"> (mở tab mới)</span></a><p class="venue-scope">${esc(practice.venue.section)}</p><details class="lesson-reference"><summary>Đối chiếu kết quả</summary><p>${esc(practice.expected)}</p></details><div class="transfer-check"><h3>Tự làm một biến thể</h3><p>${esc(practice.transfer)}</p></div><details class="lesson-reference"><summary>Kẹt ở đâu? Mở gợi ý</summary><p>${esc(practice.hint)}</p></details></section>`;
}
function applyKnowledge(n){
 const entries=Object.entries(n.learning.sessions);
 const related=entries.length?entries:n.projects.filter(id=>has(P,id)).map(id=>[id,[]]);
 return `<section class="apply-knowledge"><h2>Áp dụng trong project</h2>${related.slice(0,5).map(([pid,sids])=>{const p=P[pid],s=p.sessions.find(x=>x.id===sids[0]);return `<div class="application-route">${link(projectURL(pid,s?.id)+(s?'#lesson':''),p.title)}<p>${esc(s?'S'+p.sessions.indexOf(s)+' · '+s.title:p.question)}</p></div>`;}).join('')}${related.length>5?`<details class="lesson-reference"><summary>Thêm ${related.length-5} projects có cơ chế này</summary>${related.slice(5).map(([pid,sids])=>link(projectURL(pid,sids[0]),P[pid].title,'application-extra')).join('')}</details>`:''}</section>`;
}
function skill(){
 const n=has(N,q.get('id'))?N[q.get('id')]:null;if(!n)return missing('Kiến thức');
 const learn=n.learning,m=state.mastery[n.id]||{level:0,evidence:''};
 const pid=q.get('project'),sid=q.get('s'),origin=has(P,pid)&&P[pid].sessions.some(s=>s.id===sid)?P[pid]:null;
 const returnLink=origin?link(projectURL(pid,sid)+'#lesson','Quay lại '+origin.title+' · '+sid.toUpperCase(),'return-session secondary'):'';
 const modules=DATA.foundations.filter(f=>f.nodes.includes(n.id));
 const github=n.sources.map(id=>R[id]).filter(r=>r&&new URL(r.url).hostname==='github.com');
 const studyCoach=coachPrompt({title:n.title,context:origin?`Đang học từ ${origin.title} · ${sid.toUpperCase()}; quay lại session này sau khi xong.`:'Trạm kiến thức độc lập.',question:learn.question,flow:learn.flow,essentials:learn.essentials,resources:learn.resources,steps:learn.practice.steps,practice:learn.practice.setup,checkpoint:learn.checkpoint});
 return `<div class="breadcrumb">${link('knowledge.html','Kiến thức')}<span>/</span>${link('track.html?id='+n.track,T[n.track].short)}</div>`+header('Trạm kiến thức',n.title,learn.question,returnLink)+studyCoach+`<div class="station-layout"><div class="station-body"><section class="station-section mechanism"><h2>Cơ chế vận hành</h2>${mechanismFlow(learn.flow)}${essentials(learn.essentials)}</section><section class="station-section"><h2>Học đúng đoạn</h2><p class="section-intro">Chọn bài để trả lời câu hỏi, rồi quay lại bài thử. Nguồn tiếng Anh; hướng dẫn ở đây bằng tiếng Việt.</p><div class="teaching-list">${learn.resources.map(r=>teachingLink(r)).join('')}</div></section>${practiceStation(learn.practice)}<section class="station-section checkpoint"><h2>Qua phần này khi</h2><p>${esc(learn.checkpoint)}</p><p class="learning-tip">Đóng hướng dẫn, kể lại flow và thử input mới. Buổi sau nhớ lại cơ chế trước khi đọc tiếp.</p>${link('#assessment','Giữ evidence của bạn','quiet-link')}</section></div><aside class="station-routing">${applyKnowledge(n)}${modules.length?`<section><h2>Nền tảng liên quan</h2><div class="text-links vertical">${modules.map(f=>link('foundations.html?id='+f.id,f.title)).join('')}</div></section>`:''}${n.requires.length?`<section><h2>Nếu thiếu một mắt xích</h2><div class="text-links vertical">${n.requires.map(id=>link(skillURL(id,pid,sid),N[id].title)).join('')}</div></section>`:''}${github.length?`<details class="lesson-reference"><summary>GitHub để xem cơ chế thật</summary>${github.slice(0,3).map(r=>`<div class="github-entry"><a href="${esc(safeURL(r.url))}" target="_blank" rel="noopener noreferrer">${esc(r.name)}<span class="sr-only"> (mở tab mới)</span></a><p>${esc(r.entry)}</p></div>`).join('')}</details>`:''}</aside></div><section id="assessment" class="station-assessment"><h2>Evidence của bạn</h2><p>Seen → Trace → Modify → Build. Giữ artifact hoặc test cùng lời giải thích; session hoàn thành không tự cấp mastery.</p><form id="mastery-form"><div><label for="mastery-level">Mức bạn chứng minh được</label><select id="mastery-level">${levels.map((x,i)=>`<option value="${i}" ${m.level===i?'selected':''}>${x}</option>`).join('')}</select><p id="mastery-message" class="muted" role="status">${m.legacy?'Checkbox v1 đã giữ ở Seen; cần xác nhận bằng evidence.':'Can trace trở lên cần evidence.'}</p></div><div><label for="mastery-evidence">Project / trace / test / artifact</label><textarea id="mastery-evidence" rows="4" maxlength="10000" placeholder="Input, state, output và kết quả tôi tự làm được…">${esc(m.evidence)}</textarea><button class="primary" type="submit">Lưu assessment</button></div></form></section>`;
}
function foundationModule(f){
 const studyCoach=coachPrompt({title:f.title,question:f.question,context:'Xây nền vừa đủ cho các project trong lộ trình; dùng bài thử để chọn phần còn thiếu.',flow:f.flow,steps:f.route.map(x=>`${N[x.node].title}: ${x.purpose} Thử ${N[x.node].learning.practice.title}.`),resources:f.resources,checkpoint:f.ready,practice:f.projects.map(id=>P[id].title).join(', ')});
 const relevant=new Set(f.nodes.flatMap(id=>N[id].sources));
 const github=[...relevant].map(id=>R[id]).filter(r=>r&&new URL(r.url).hostname==='github.com').slice(0,3);
 return `<div class="breadcrumb">${link('foundations.html','Nền tảng')}<span>/</span><span>${esc(f.category)}</span></div>`+header('Điểm vào theo năng lực',f.title,f.question)+studyCoach+`<div class="station-layout"><div class="station-body"><section class="foundation-diagnostic"><h2>Thử trước, học phần còn thiếu</h2><p>${esc(f.ready)}</p>${mechanismFlow(f.flow)}<p class="learning-tip">Chọn một bài thử bên dưới. Nếu đã giải thích được flow và xử lý biến thể, đi thẳng vào project.</p></section><section class="station-section"><h2>Đường đi gợi ý</h2><ol class="foundation-route">${f.route.map((step,i)=>{const n=N[step.node];return `<li><span class="route-index">${i+1}</span><div>${link(skillURL(n.id),n.title)}<p>${esc(step.purpose)}</p><span class="route-practice">Thử: ${esc(n.learning.practice.title)}</span></div></li>`;}).join('')}</ol></section><section class="station-section"><h2>Lecture & nơi thực hành</h2><div class="teaching-list">${f.resources.map(r=>teachingLink(r)).join('')}</div><p class="learning-tip">Bài thực hành từng cơ chế nằm trong trang Kiến thức. Course exercises hoặc simulator là điểm vào khi chưa muốn setup repo.</p></section>${github.length?`<section class="station-section"><h2>GitHub để bắt đầu</h2>${github.map(r=>`<div class="github-entry"><a href="${esc(safeURL(r.url))}" target="_blank" rel="noopener noreferrer">${esc(r.name)}<span class="sr-only"> (mở tab mới)</span></a><p>Entry: ${esc(r.entry)}</p><p class="muted">${esc(r.setup)}</p></div>`).join('')}</section>`:''}<section class="station-section"><h2>Đưa vào project</h2>${f.projects.map(projectRow).join('')}</section></div><aside class="foundation-switcher"><h2>Nền tảng khác</h2><nav aria-label="Nhóm nền tảng">${DATA.foundations.map(x=>`<a href="foundations.html?id=${x.id}" ${x.id===f.id?'aria-current="page"':''}>${esc(x.title)}</a>`).join('')}</nav>${link('knowledge.html','Tìm một kiến thức cụ thể','quiet-link')}</aside></div>`;
}
function foundations(){
 if(q.has('id')){const f=DATA.foundations.find(x=>x.id===q.get('id'));return f?foundationModule(f):missing('Nền tảng');}
 return header('Nền tảng theo nhu cầu','Bạn đang thiếu mắt xích nào?','C++, DSA và Git đã biết được dùng làm điểm vào. Chọn cơ chế để thử; mở lecture khi cần.',link('knowledge.html','Tìm kiến thức','secondary'))+`<div class="foundation-intro"><p><strong>Chọn nhóm → thử một cơ chế → học đúng đoạn → áp dụng vào project.</strong></p><p>Không có hàng môn bắt buộc. Mỗi nhóm có flow, bài thử, lecture và code/course practice.</p></div><div class="station-search"><label for="foundation-search">Tìm nền tảng</label><input id="foundation-search" type="search" placeholder="Networking, memory, Git…"><p id="foundation-count" class="muted" role="status"></p></div><div id="foundation-results" class="foundation-stations"></div><div class="cross-paths">${DATA.paths.map(x=>`<section id="${x.id}"><h2>${esc(x.title)} khi project cần</h2>${flow(x.steps.join(' → '))}<div class="text-links">${x.projects.map(id=>link(projectURL(id),P[id].title)).join('')}</div></section>`).join('')}</div>`;
}
function renderFoundations(){
 const term=fold($('foundation-search').value);
 const modules=DATA.foundations.filter(f=>fold([f.title,f.question,f.flow,...f.nodes.map(id=>N[id].title)].join(' ')).includes(term));
 $('foundation-count').textContent=modules.length+' nhóm · mở một nhóm để chọn điểm vào';
 $('foundation-results').innerHTML=modules.map(f=>`<a class="foundation-station" href="foundations.html?id=${f.id}"><span class="foundation-category">${esc(f.category)}</span><div><h2>${esc(f.title)}</h2><p>${esc(f.question)}</p><span class="station-route-preview">${f.nodes.length} cơ chế · ${esc(P[f.projects[0]].title)}</span></div><span aria-hidden="true" class="station-open">›</span></a>`).join('')||'<p class="empty-state">Không thấy nhóm này. Thử “Git”, “networking” hoặc tìm ở Kiến thức.</p>';
}
function knowledge(){
 const track=has(T,q.get('track'))?q.get('track'):'';
 return header('Trạm trung chuyển','Kiến thức','Một flow, vài ý trọng yếu, bài học đúng phần và bài thử để mang vào project.',link('foundations.html','Chọn nền tảng','secondary'))+`<div class="knowledge-search"><div><label for="knowledge-search">Tìm cơ chế</label><input id="knowledge-search" type="search" value="${esc(q.get('q')||'')}" placeholder="Framing, ownership, attention…"></div><div><label for="knowledge-track">Hướng học</label><select id="knowledge-track"><option value="">Mọi hướng</option>${DATA.tracks.map(t=>`<option value="${t.id}" ${track===t.id?'selected':''}>${esc(t.short)}</option>`).join('')}</select></div></div><p id="knowledge-count" class="muted" role="status"></p><div id="knowledge-results" class="knowledge-index"></div>`;
}
function renderKnowledge(updateURL=false){
 const term=fold($('knowledge-search').value),track=$('knowledge-track').value;
 const nodes=DATA.nodes.filter(n=>(!track||n.track===track)&&fold([n.title,n.learning.question,n.learning.flow,...n.learning.essentials.map(x=>x.body)].join(' ')).includes(term));
 $('knowledge-count').textContent=nodes.length+' kiến thức · chọn để xem flow, lecture và bài thử';
 $('knowledge-results').innerHTML=nodes.map(n=>`<a class="knowledge-row" href="${skillURL(n.id)}"><span class="knowledge-track" style="--track:${T[n.track].color}">${esc(T[n.track].short)}</span><div><h2>${esc(n.title)}</h2><p>${esc(n.learning.question)}</p><span class="knowledge-flow-preview">${esc(n.learning.flow)}</span></div><span class="knowledge-state">${esc(levels[state.mastery[n.id]?.level||0])}</span></a>`).join('')||'<p class="empty-state">Không thấy cơ chế này. Thử tên khác hoặc đổi hướng học.</p>';
 if(updateURL){const params=new URLSearchParams();if(track)params.set('track',track);if($('knowledge-search').value)params.set('q',$('knowledge-search').value);history.replaceState(null,'','knowledge.html'+(params.size?'?'+params:''));}
}
function bindStations(page){
 if(page==='knowledge'){renderKnowledge();for(const id of ['knowledge-search','knowledge-track'])$(id).addEventListener('input',()=>renderKnowledge(true));}
 if(page==='foundations'&&$('foundation-search')){renderFoundations();$('foundation-search').addEventListener('input',renderFoundations);}
}
