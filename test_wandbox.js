async function testWandbox() {
  const res = await fetch('https://wandbox.org/api/compile.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      compiler: "ghc-head",
      code: "main = putStrLn \"Hello from Wandbox!\""
    })
  });
  const data = await res.json();
  console.log(data);
}
testWandbox();
