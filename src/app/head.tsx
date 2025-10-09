export default function Head(title: string) {
  return (
    <>
      <title>{title}</title>
      <meta content="width=device-width, initial-scale=1" name="viewport" />
      <meta name="description" content="Track matches, predict winners, and view tournament brackets for football, basketball, and volleyball competitions." />
      <link rel="icon" href="/logo/logo.svg" />
    </>
  );
}

