export async function POST() {
  const stream = new ReadableStream({
    start(controller) {
      const words = [
        "winner: ",
        "opponent2. ",
        "reason: ",
        "Hello ",
        "this ",
        "is ",
        "a ",
        "test ",
        "streaming ",
        "response.",
      ]

      function stream() {
        const word = words.shift()
        if (!word) return controller.close()
        controller.enqueue(word)

        setTimeout(stream, 100)
      }

      stream()
    },
  })

  return new Response(stream)
}
