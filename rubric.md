# **AI-Powered Code Review Assistant — Challenger Project**

## **Overview**
Build a standalone AI assistant that delivers intelligent, contextual **block-level code review**. Traditional code review is slow, and generic AI chat tools lack precision. Your task is to create an experience where users get **targeted, contextualized feedback** on specific code selections.

---

## **The Challenge**
Users should be able to:

- Paste or write code in an editor  
- Select specific lines or code blocks  
- Request AI feedback on exactly that selection  
- Receive contextual suggestions, explanations, and improvements  
- Maintain iterative conversation threads tied to code sections  

Think: **“inline GitHub comments × AI assistant.”**  
The AI must understand the selected snippet *and* the surrounding context.

---

## **Core Requirements**

### **Your solution must include:**
- **Code editor interface** with syntax highlighting  
- **Selection-based interaction** for targeting specific code blocks  
- **Contextual AI responses** (code context + language + file type)  
- **Inline conversation threads** visually tied to code selections  
- **Multiple independent threads** per file  

---

## **Technical Constraints**
- Standalone application (no credentials from us required)  
- Language-agnostic (JS, Python, Go, etc.)  
- Any AI provider (OpenAI, Anthropic, local, or mocked)  
- Any tech stack you prefer (React, Vue, Flask, etc.)

---

## **What We’re Evaluating**

### **Technical Execution**
- Architecture and code quality  
- State management for multiple comment threads  
- Developer-centric UI/UX  
- API integration patterns  

### **Product Thinking**
- Natural, intuitive interaction flow  
- How you send context to the AI  
- Handling long files, nested selections, multi-language support  

### **Scaling**
- Applicability to real codebases  
- Team collaboration considerations  
- Security and privacy implications  

---

## **Expected Deliverables**

### **1. Working Application**
A functional prototype showing the full workflow. Shortcuts OK, but it must work.

### **2. Brief Documentation (README)**
Include:
- How to run the app  
- Key architectural decisions  
- What you’d improve with more time  
- How AI tools were used  
- Trade-offs you made  

### **3. Code**
- Clean structure  
- Readable, commented where unclear  
- Logical commit history  

---

## **Suggested Approach**

### **Phase 1 (1–1.5 hrs): Core UI**
- Build code editor (Monaco, CodeMirror, or textarea)  
- Implement text selection logic  
- Build UI for comment threads  

### **Phase 2 (1.5–2 hrs): AI Integration**
- Integrate an AI API  
- Construct contextual prompts  
- Display inline AI responses  

### **Phase 3 (1–1.5 hrs): Multiple Threads**
- Support multiple comment threads  
- Visual indicators for commented code  
- Thread creation + management  

### **Phase 4 (0.5–1 hr): Polish & Docs**
- Edge-case handling  
- Write README  
- Test end-to-end flow  

---

## **Bonus Ideas (Optional)**
- AI-suggested code changes  
- Diff previews for changes  
- Automatic language detection  
- Persist conversation history after code edits  
- Export full AI feedback summary  

---

## **Using AI Tools**
Feel free to use ChatGPT, Claude, Copilot, Cursor, etc.  
Document:

- What you used AI for  
- How you verified results  
- What worked well vs. what didn’t  

---

## **Example User Flow**
1. User pastes a Python function  
2. Highlights lines 5–8  
3. Clicks **Ask AI**  
4. Asks: “Is there a clearer way to write this?”  
5. AI analyzes full function  
6. Suggests refactor + explanation  
7. User follows up  
8. User selects another region and starts a new thread  

---

## **Technical Notes**
- API: mock or real; keep integration swappable  
- Editor: don’t over-engineer; even a textarea works  
- Interesting challenge: state management for comment-to-range mapping  

---

## **Evaluation Criteria**

### **Must Have**
- Working selection + comment UX  
- AI responses with context  
- Multiple independent threads  
- Clean, understandable code  

### **Nice To Have**
- Polished UI/UX  
- Smart context packaging  
- Edge-case handling  
- Clear documentation  

---

## **Context: Why It Matters**
WordPress Core 6.9 is adding block-level comments. Integrating AI here creates a natural, powerful editorial workflow far better than standalone chat windows. Your prototype will demonstrate what the future of collaborative code + content editing could look like.

Build something thoughtful, intuitive, and technically sound.  
Show how you approach a new product in an existing ecosystem.
