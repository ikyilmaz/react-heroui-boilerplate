import { AlertDialog, Button, Typography } from '@heroui/react'
import { formatTemplate } from '../functions/formatTemplate'

/*
  The root is required: `AlertDialog.Header` / `Body` / `Footer` take their layout classes from the
  context the root provides. Skipping it and controlling `Backdrop` left the slots empty and the
  heading overlapped the buttons.

  The root is also RAC's `DialogTrigger`; it treats its first child as the trigger and expects it
  to be pressable ("PressResponder was rendered without a pressable child"). The real triggers are
  the delete buttons in the rows, so an invisible placeholder goes here.
*/
/**
 * `editing.confirmDelete`. Not in DevExtreme: `{0}` in the title or message is replaced with the
 * row's label.
 */
export function ConfirmDeleteDialog({
  rowLabel,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: {
  /** `null` keeps the dialog closed. */
  rowLabel: string | null
  title: string
  message: string
  confirmText: string
  cancelText: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const heading = formatTemplate(title || message, rowLabel ?? '')
  const body = title ? formatTemplate(message, rowLabel ?? '') : ''
  return (
    <AlertDialog isOpen={rowLabel !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialog.Trigger className="hidden" aria-hidden tabIndex={-1} />
      {/*
        `Backdrop` is required: it is RAC's `ModalOverlay`, the layer pinning the dialog to the
        screen. `isKeyboardDismissDisabled` defaults to `true` in HeroUI; for a delete
        confirmation Escape means "cancel", the safe option, so it is allowed.
      */}
      <AlertDialog.Backdrop isKeyboardDismissDisabled={false}>
        <AlertDialog.Container>
          <AlertDialog.Dialog role="alertdialog">
            <AlertDialog.Header>
              <AlertDialog.Heading>{heading}</AlertDialog.Heading>
            </AlertDialog.Header>
            {body && (
              <AlertDialog.Body>
                <Typography type="body-sm" color="muted">
                  {body}
                </Typography>
              </AlertDialog.Body>
            )}
            {/*
              `AlertDialog.CloseTrigger` is the corner "×" (`absolute end-4 top-4`); used in the
              footer the two buttons overlapped. Plain `Button`s close the dialog through state.
            */}
            <AlertDialog.Footer className="justify-end gap-2">
              <Button size="sm" variant="ghost" onPress={onCancel}>
                {cancelText}
              </Button>
              <Button size="sm" variant="danger" onPress={onConfirm}>
                {confirmText}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  )
}
