const http = require("http");

async function runLoadTest() {
  console.log("Iniciando Teste de Carga - /api/tickets");
  const url = "http://localhost:3000/api/tickets";
  
  const totalRequests = 100;
  const concurrentLimit = 10;
  
  let successCount = 0;
  let errorCount = 0;
  const latencies = [];

  const executeRequest = async () => {
    const start = performance.now();
    try {
      const res = await fetch(url);
      const text = await res.text();
      if (res.ok) {
        successCount++;
      } else {
        errorCount++;
      }
    } catch (e) {
      errorCount++;
    }
    const end = performance.now();
    latencies.push(end - start);
  };

  const batches = Math.ceil(totalRequests / concurrentLimit);
  const totalStart = performance.now();

  for (let i = 0; i < batches; i++) {
    const promises = [];
    for (let j = 0; j < concurrentLimit; j++) {
      if (i * concurrentLimit + j < totalRequests) {
        promises.push(executeRequest());
      }
    }
    await Promise.all(promises);
  }

  const totalEnd = performance.now();
  
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const maxLatency = Math.max(...latencies);
  const minLatency = Math.min(...latencies);

  console.log("\n=== Resultados do Teste de Carga ===");
  console.log(`Total de Requisições: ${totalRequests}`);
  console.log(`Sucessos: ${successCount}`);
  console.log(`Erros: ${errorCount}`);
  console.log(`Tempo Total: ${(totalEnd - totalStart).toFixed(2)}ms`);
  console.log(`Latência Média: ${avgLatency.toFixed(2)}ms`);
  console.log(`Latência Mínima: ${minLatency.toFixed(2)}ms`);
  console.log(`Latência Máxima: ${maxLatency.toFixed(2)}ms`);
  console.log("====================================");
}

runLoadTest();
