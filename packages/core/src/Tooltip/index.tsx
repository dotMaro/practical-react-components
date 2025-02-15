import React, {
  useState,
  useEffect,
  useLayoutEffect,
  Children,
  ReactElement,
} from 'react'
import styled, { css } from 'styled-components'
import { useBoolean } from 'react-hooks-shareable'

import { Typography, TypographyProps } from '../Typography'
import { PopOver, PopOverProps } from '../PopOver'
import { shape, spacing, componentSize } from '../designparams'
import { font } from '../theme'

/**
 * Tooltip
 *
 * A small info shown on hover.
 * Positioned below the anchor element,
 * aliigned to it's center.
 */

export const TOOLTIP_DELAY_MS = 250

const BaseTooltipWrapper = styled.div`
  display: flex;
  max-width: 280px;
  border-radius: ${shape.radius.small};

  > * {
    white-space: pre-line;
  }
`

const TooltipWrapper = styled(BaseTooltipWrapper)`
  align-items: center;

  margin: ${spacing.small};
  padding: ${spacing.small} ${spacing.medium};

  min-height: ${componentSize.mini};

  color: ${({ theme }) => theme.color.background00()};
  background-color: ${({ theme }) => theme.color.text04()};
`

export const ExpandedTooltipAnimation = css`
  animation: fadein 200ms ease-out;

  @keyframes fadein {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }
`

const ExpandedTooltipWrapper = styled(BaseTooltipWrapper)`
  flex-direction: column;
  align-items: flex-start;
  gap: ${spacing.medium};

  margin: ${spacing.medium};
  padding: ${spacing.medium};

  height: auto;

  color: ${({ theme }) => theme.color.text01()};
  background-color: ${({ theme }) => theme.color.background00()};
  box-shadow: ${({ theme }) => theme.shadow.tooltip};

  word-break: break-word;

  ${ExpandedTooltipAnimation}
`

const ExpandedTooltipTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  white-space: nowrap;
  gap: ${spacing.medium};
`

const ExpandedTooltipTitle = styled(Typography).attrs({
  variant: 'chip-tag-text',
})`
  font-weight: ${font.fontWeight.semibold};
  white-space: nowrap;
`

const ExpandedTooltipExtraInfo = styled(Typography).attrs({
  variant: 'compact-label',
})``

const StyledExpandedTooltipTypography = styled(Typography).attrs({
  variant: 'chip-tag-text',
})`
  white-space: normal;
`

export const ExpandedTooltipTypography: React.FC<
  Omit<TypographyProps, 'variant'>
> = ({ children }) => (
  <StyledExpandedTooltipTypography>{children}</StyledExpandedTooltipTypography>
)

const upDownArrowBase = css`
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
`
const TooltipUpArrow = styled.div`
  ${upDownArrowBase};
  margin-top: 3px;
  border-bottom: 5px solid ${({ theme }) => theme.color.background00()};
`
const TooltipDownArrow = styled.div`
  ${upDownArrowBase};
  margin-bottom: 3px;
  border-top: 5px solid ${({ theme }) => theme.color.background00()};
`

const leftRightArrowBase = css`
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
`
const TooltipLeftArrow = styled.div`
  ${leftRightArrowBase};
  margin-left: 3px;
  border-right: 5px solid ${({ theme }) => theme.color.background00()};
`
const TooltipRightArrow = styled.div`
  ${leftRightArrowBase};
  margin-right: 3px;
  border-left: 5px solid ${({ theme }) => theme.color.background00()};
`

type Placement = 'up' | 'right' | 'down' | 'left'

const pointInBounds = (pos: readonly [number, number]) =>
  pos[0] >= 0 &&
  pos[0] <= document.documentElement.clientWidth &&
  pos[1] >= 0 &&
  pos[1] <= document.documentElement.clientHeight

const rectInBounds = (
  pos: readonly [number, number],
  size: readonly [number, number]
) => pointInBounds(pos) && pointInBounds([pos[0] + size[0], pos[1] + size[1]])

const alignments: Record<
  Placement,
  Required<
    Pick<
      PopOverProps,
      | 'horizontalPosition'
      | 'horizontalAlignment'
      | 'verticalPosition'
      | 'verticalAlignment'
    >
  >
> = {
  up: {
    horizontalPosition: 'center',
    horizontalAlignment: 'center',
    verticalPosition: 'top',
    verticalAlignment: 'bottom',
  },
  down: {
    horizontalPosition: 'center',
    horizontalAlignment: 'center',
    verticalPosition: 'bottom',
    verticalAlignment: 'top',
  },
  left: {
    horizontalPosition: 'left',
    horizontalAlignment: 'right',
    verticalPosition: 'center',
    verticalAlignment: 'center',
  },
  right: {
    horizontalPosition: 'right',
    horizontalAlignment: 'left',
    verticalPosition: 'center',
    verticalAlignment: 'center',
  },
}

const arrows: Record<Placement, ReactElement> = {
  left: <TooltipRightArrow />,
  right: <TooltipLeftArrow />,
  up: <TooltipDownArrow />,
  down: <TooltipUpArrow />,
}

interface TooltipProps extends Omit<PopOverProps, 'anchorEl'> {
  /**
   * Optional Tooltip variant.
   * Default: `default`
   */
  readonly variant?: 'default'
  /**
   * text inside the tooltip.
   */
  readonly text: string
}

interface ExpandedTooltipProps extends Omit<PopOverProps, 'anchorEl'> {
  /**
   * Required Tooltip variant.
   */
  readonly variant: 'expanded'
  /**
   * Optional placement.
   * Default: `up-down`
   */
  readonly placement?: 'up-down' | 'left-right'
  /**
   * Optional semibold title text inside the tooltip.
   */
  readonly tipTitle?: string
  /**
   * Optional extra info shown in the right corner.
   */
  readonly extraInfo?: string
  /**
   * React element that will appear under the tipTitle.
   * Recommend to use `ExpandedTooltipTypography` to get proper Typography.
   */
  readonly contents: React.ReactNode
}

export const Tooltip: React.FC<TooltipProps | ExpandedTooltipProps> = ({
  children,
  ...props
}) => {
  const placement =
    (props.variant === 'expanded' ? props.placement : undefined) ?? 'up-down'
  const child = Children.only(children) as ReactElement
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const [visible, show, hide] = useBoolean(false)
  const [debouncedVisible, setDebouncedVisible] = useState(visible)
  const [layout, setLayout] = useState<Placement>('down')
  const [tooltipEl, setTooltipEl] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    const delayVisible = () => setDebouncedVisible(visible)
    const delayed = setTimeout(delayVisible, TOOLTIP_DELAY_MS)
    return () => {
      clearTimeout(delayed)
    }
  }, [visible])

  useLayoutEffect(() => {
    if (anchorEl === null) {
      return
    }
    anchorEl.addEventListener('pointerover', show)
    anchorEl.addEventListener('pointerout', hide)
    return () => {
      anchorEl.removeEventListener('pointerover', show)
      anchorEl.removeEventListener('pointerout', hide)
    }
  }, [anchorEl, hide, show])

  useLayoutEffect(() => {
    if (tooltipEl === null || anchorEl === null) {
      return
    }

    const bounds = anchorEl.getBoundingClientRect()

    // "16" is for space of margin of ExpandedTooltipWrapper + arrow size.
    const tooltipSize: [number, number] = [
      tooltipEl.clientWidth + 16,
      tooltipEl.clientHeight + 16,
    ]
    const tooltipMid = [
      bounds.left + (bounds.right - bounds.left) / 2,
      bounds.top + (bounds.bottom - bounds.top) / 2,
    ]

    const spaces: Record<Placement, boolean> = {
      down: rectInBounds(
        [tooltipMid[0] - tooltipSize[0] / 2, bounds.bottom],
        tooltipSize
      ),
      up: rectInBounds(
        [tooltipMid[0] - tooltipSize[0] / 2, bounds.top - tooltipSize[1]],
        tooltipSize
      ),
      left: rectInBounds(
        [bounds.left - tooltipSize[0], tooltipMid[1] - tooltipSize[1] / 2],
        tooltipSize
      ),
      right: rectInBounds(
        [bounds.right, tooltipMid[1] - tooltipSize[1] / 2],
        tooltipSize
      ),
    }

    if (placement === 'up-down') {
      if (spaces.up || spaces.down) {
        setLayout(spaces.down ? 'down' : 'up')
      } else {
        setLayout(spaces.right ? 'right' : 'left')
      }
    } else if (placement === 'left-right') {
      if (spaces.right || spaces.left) {
        setLayout(spaces.right ? 'right' : 'left')
      } else {
        setLayout(spaces.up ? 'up' : 'down')
      }
    }
  }, [anchorEl, tooltipEl, props, placement])

  if (props.variant !== 'expanded') {
    return (
      <>
        {React.cloneElement(child, {
          ref: setAnchorEl,
        })}
        {debouncedVisible ? (
          <PopOver anchorEl={anchorEl} {...alignments[layout]} {...props}>
            <TooltipWrapper ref={setTooltipEl}>
              <Typography variant="chip-tag-text">{props.text}</Typography>
            </TooltipWrapper>
          </PopOver>
        ) : null}
      </>
    )
  }

  const { tipTitle, extraInfo, contents } = props

  return (
    <>
      {React.cloneElement(child, {
        ref: setAnchorEl,
      })}
      {debouncedVisible ? (
        <>
          <PopOver anchorEl={anchorEl} {...alignments[layout]} {...props}>
            <ExpandedTooltipWrapper ref={setTooltipEl}>
              {tipTitle !== undefined || extraInfo !== undefined ? (
                extraInfo !== undefined ? (
                  <ExpandedTooltipTop>
                    <ExpandedTooltipTitle>{tipTitle}</ExpandedTooltipTitle>
                    <ExpandedTooltipExtraInfo>
                      {extraInfo}
                    </ExpandedTooltipExtraInfo>
                  </ExpandedTooltipTop>
                ) : (
                  <ExpandedTooltipTitle>{tipTitle}</ExpandedTooltipTitle>
                )
              ) : null}
              {contents}
            </ExpandedTooltipWrapper>
          </PopOver>
          <PopOver anchorEl={anchorEl} {...alignments[layout]}>
            {arrows[layout]}
          </PopOver>
        </>
      ) : null}
    </>
  )
}
