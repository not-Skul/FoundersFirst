from fastapi import FastAPI
from dotenv import load_dotenv
from rag import final_answer, final_roadmap_answer

load_dotenv()

app = FastAPI()

@app.get("/test")
def initialTest():
    return {
        "status": "success",
        "message": "AI backend is working 🚀"
    }

@app.get("/rag/{query}")
async def get_rag_response(query: str):
    
    response = await final_answer(query)
    return {
        "status": "success",
        "query": query,
        "response": response
    }

@app.get("/roadmap/")
async def get_roadmap_response(query: str):
    query = query.replace("%20", " ")
    print("Received roadmap query:", query)
    response = await final_roadmap_answer(query)
    return {
        "status": "success",
        "query": query,
        "response": response
        }