import asyncio
import pygame

WINDOW_WIDTH = 700
WINDOW_HEIGHT = 700
BACKGROUND_COLOR = (20, 24, 38)
FPS = 60


async def main():
    pygame.init()
    screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
    pygame.display.set_caption("Connect Four Solver")
    clock = pygame.time.Clock()

    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        screen.fill(BACKGROUND_COLOR)
        pygame.display.flip()

        clock.tick(FPS)
        await asyncio.sleep(0)

    pygame.quit()


asyncio.run(main())