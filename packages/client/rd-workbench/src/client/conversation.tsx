/** Embed the native Harness Conversation under an independently retained Session. */
import type { SessionReference } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ConversationViewsProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {
  FactoryComponentPropsOf, HostObservable, PropsRenderFactories, PropsRuntime,
} from '@deepseek-ai/dsh-client-ui-slots'

declare module '@deepseek-ai/dsh-api-session-controller/client' {
  interface SessionReferenceSourceMap {
    /** R&D conversation occurrence; does not own the Host Agent. */
    rdWorkbench: unknown
  }
}
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /** Native transcript bound to the selected workflow Session. */
    'rd.conversation.session': { kind: 'single'; scope: 'session' }
  }
  interface SlotFactoryMap {
    /** Root host which supplies the standard SessionProvider reference. */
    'rd.conversation': {
      scope: 'root'
      props: object
      children: { 'rd.conversation.session': { kind: 'single'; scope: 'session' } }
      inject: { hooks: { reference: HostObservable<SessionReference | undefined> } }
    }
  }
}

/**
 * Keep the embedded conversation on the standard Chat view.
 * @param props - native Conversation renderer seats.
 * @returns streamed messages, reasoning and tool nodes.
 */
function ChatView(props: ConversationViewsProps) {
  return props.renderSlot('conversation.session', { view: 'chat' })
}

/**
 * Mount the shared renderer while the workflow owns input admission.
 * @param props - Session-scoped factory seats.
 * @returns the native Conversation without a second composer.
 */
export function NativeConversation(props: PropsRuntime<'rd.conversation.session'> & PropsRenderFactories) {
  return props.renderFactorySlot('conversation.content', {
    variant: 'embedded', phase: 'active', hero: false, hideComposer: true,
  }, { slots: { views: ChatView } })
}

/**
 * Bind one native Session reference using the standard provider.
 * @param props - private retained reference and renderer seats.
 * @returns the selected native Conversation occurrence.
 */
export function ConversationHost(props: FactoryComponentPropsOf<'rd.conversation'>) {
  const reference = props.useReference(value => value)
  if (!reference) return null
  return <props.SessionProvider session={reference}>
    {props.renderSlot('rd.conversation.session', {})}
  </props.SessionProvider>
}
