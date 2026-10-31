const endpoint = process.env.LOCALSTACK_ENDPOINT ?? 'http://localstack:4566';
const timeoutMs = Number(process.env.LOCALSTACK_TIMEOUT_MS ?? 60_000);
const startedAt = Date.now();

while (Date.now() - startedAt < timeoutMs) {
  try {
    const response = await fetch(`${endpoint}/_localstack/health`);
    if (response.ok) {
      console.log(`LocalStack is ready at ${endpoint}`);
      process.exit(0);
    }
  } catch {
    // The emulator is still starting.
  }

  await new Promise((resolve) => setTimeout(resolve, 1_000));
}

throw new Error(`LocalStack did not become ready within ${timeoutMs}ms at ${endpoint}`);
