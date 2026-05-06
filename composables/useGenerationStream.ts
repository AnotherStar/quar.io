// Holds the AI-generated block list across navigation so the editor page can
// animate blocks appearing one-by-one ("typing" effect).
//
// Lifecycle:
//   - dashboard modal POSTs file → receives {instruction, aiBlocks}
//   - calls setStream({ instructionId, blocks }) and navigates with ?streaming=1
//   - editor page reads via consumeStream(id), animates, returns nothing on reread
import type { AiBlock } from '~~/server/utils/aiInstructionGenerator'

interface State {
  instructionId: string
  blocks: AiBlock[]
}

export function useGenerationStream() {
  const state = useState<State | null>('mo:gen-stream', () => null)

  function set(s: State) {
    state.value = s
  }

  function consume(instructionId: string): AiBlock[] | null {
    if (!state.value || state.value.instructionId !== instructionId) return null
    const blocks = state.value.blocks
    state.value = null
    return blocks
  }

  return { set, consume }
}
