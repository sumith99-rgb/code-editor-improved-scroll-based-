async function test() {
  const params = new URLSearchParams();
  params.append('LanguageChoice', '11'); // 11 = Haskell
  params.append('Program', 'main = putStrLn "Hello from Rextester API"');
  params.append('Input', '');
  params.append('CompilerArgs', '');

  const res = await fetch('https://rextester.com/rundotnet/api', {
    method: 'POST',
    headers: { 'Content-type': 'application/x-www-form-urlencoded' },
    body: params
  });
  const data = await res.json();
  console.log(data);
}
test();
