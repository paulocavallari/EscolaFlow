const openRouterApiKey = "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";
const textToProcess = "a prof maria tava dando aula ai os meninos da turma da manha comecaram a tacar bolinha de papel uns nos outros, a sala ficou mo zona, todo mundo gritando, ai eu fui la mandar a galera sentar e a leticia disse q n ia pq qria continuar brincando, fomos pra diretoria e la ela pegou suspensao e o lucas tbm q tava na baguna, ligamo pros pais deles e ngm atendeu";

const formalRewritePrompt = `Você é um assistente escolar que reescreve relatos de ocorrência de forma culta, clara e direta.

Diretrizes:
1. Tom: Direto, objetivo e imparcial. Evite palavras muito rebuscadas ou redundâncias.
2. Tempo Verbal: Use SEMPRE o PASSADO SIMPLES (Pretérito Perfeito). Exemplo: "O aluno chutou" (ERRADO: "foi encontrado chutando" ou "estava chutando").
3. Fidelidade: Mantenha apenas os fatos relatados. NÃO invente nomes, regras ou punições.
4. Exemplo de saída esperada: "O aluno Gabriel chutou a porta da sala de aula. Mesmo após o professor adverti-lo verbalmente, o aluno recusou-se a entrar na sala."
5. Formato: Retorne APENAS o texto reescrito. Nada de aspas, saudações ou explicações.

Texto original:
"${textToProcess}"
`;

async function testModel(model) {
    console.log(`Testing model: ${model}`);
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${openRouterApiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: formalRewritePrompt }],
            temperature: 0.2,
            max_tokens: 1024
        })
    });
    const data = await res.json();
    console.log("Finish Reason:", data.choices?.[0]?.finish_reason);
    console.log("Response:", data.choices?.[0]?.message?.content);
    if (data.error) console.log("Error:", data.error);
}

async function run() {
    console.log("------------------------");
    await testModel("google/gemma-3-12b-it:free");
    console.log("------------------------");
    await testModel("qwen/qwen3-next-80b-a3b-instruct:free");
    console.log("------------------------");
    await testModel("meta-llama/llama-3.3-70b-instruct:free");
}

run();
