import { ProjectLink } from "./ProjectLink";
import { projects } from "./projects";

const pageTitle = "Brendan’s projects";
const fontStylesheet = "https://fonts.googleapis.com/css2?family=Mona+Sans:wdth,wght@100..125,400..700&display=swap";

export function LandingPage({ styles }: { styles: string }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <title>{pageTitle}</title>
        <meta name="description" content="Links to the projects Brendan Giang hosts on appiest.github.io." />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={fontStylesheet} />
        <style dangerouslySetInnerHTML={{ __html: styles }} />
      </head>
      <body className="bg-surface font-sans text-ink antialiased">
        <main className="mx-auto max-w-2xl px-6 py-16 sm:py-28">
          <h1 className="font-stretch-semi-expanded text-4xl/tight font-bold text-balance">{pageTitle}</h1>
          <ul className="mt-8 flex flex-col gap-1 sm:mt-10">
            {projects.map((project) => (
              <li key={project.path}>
                <ProjectLink project={project} />
              </li>
            ))}
          </ul>
        </main>
      </body>
    </html>
  );
}
