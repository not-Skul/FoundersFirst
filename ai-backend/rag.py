from mongo import collection
from langchain_google_genai import GoogleGenerativeAI,GoogleGenerativeAIEmbeddings

model = GoogleGenerativeAIEmbeddings(model="gemini-embedding-001",output_dimensionality=768)
llm = GoogleGenerativeAI(model="gemini-2.5-flash-lite")
# Run inference with queries and documents
async def generate_embedding(text):
    embedding = model.embed_query(text)
    return embedding

async def get_query_results(query):
  """Gets results from a vector search query."""

  query_embedding = await generate_embedding(query)
  print(query_embedding)
  pipeline = [
      {
            "$vectorSearch": {
              "index": "vector_index",
              "queryVector": query_embedding,
              "path": "embedding",
              "numCandidates":100,
              "limit": 5
            }
      }, {
            "$project": {
              "_id": 0,
              "text": 1
         }
      }
  ]

  results = collection.aggregate(pipeline)
  print(results)

  array_of_results = []
  for doc in results:
      array_of_results.append(doc)
  return array_of_results


async def final_answer(query):
    context_docs = await get_query_results(query)
    context_string = " ".join([doc["text"] for doc in context_docs])

    prompt = f"""Use the following pieces of context to answer the question at the end.
        {context_string}
        Question: {query}
    """
    result = llm.invoke(prompt)
    return result


async def final_roadmap_answer(query):
    context_docs = await get_query_results(query)
    context_string = " ".join([doc["text"] for doc in context_docs])

    prompt = f"""
Using the provided startup context and idea, generate a clear, actionable roadmap that a founder can follow to build and launch their startup. The roadmap should be structured in sequential phases and tailored to an early-stage startup.
Context: {context_string}
Idea and Target Users: {query}
Requirements:

Base the roadmap on the given idea, target users, and problem being solved.

Assume the user is a first-time founder unless otherwise specified.

Focus on practical, execution-oriented steps.

Each phase should include a concise goal and concrete tasks.

Output Format (strictly follow this structure):

{{
  phase: '1',
  title: "Validation & Research",
  description: "Validate your idea and understand the market",
  tasks: [
    "Conduct market research in your target segment",
    "Interview 20+ potential customers",
    "Analyze competitors in the space",
    "Define your unique value proposition"
  ]
}},
{{
  phase: '2',
  title: "MVP Development",
  description: "Build your minimum viable product",
  tasks: [
    "Define core features for MVP",
    "Choose technology stack",
    "Build prototype in 4–6 weeks",
    "Get early feedback from beta users"
  ]
}},
{{
  phase: '3',
  title: "Go-to-Market",
  description: "Launch and acquire your first customers",
  tasks: [
    "Create marketing strategy",
    "Set up social media presence",
    "Launch on relevant platforms",
    "Implement referral program"
  ]
}}


Add additional phases if necessary (e.g., Iteration, Scaling, Fundraising).

Keep task descriptions concise and action-focused."""
    
    result = llm.invoke(prompt)
    return result