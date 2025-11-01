#!/usr/bin/env python3
import os
import sys
import arxiv
import re
from typing import Optional

def clean_filename(filename: str) -> str:
    """Remove invalid characters from a string to make it a safe filename/folder name."""
    return re.sub(r'[\\/*?:"<>|]', "", filename).replace(" ", "_").strip(".")

DEFAULT_OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "downloads")

def download_arxiv_paper(arxiv_id_or_url: str, output_base_dir: str = DEFAULT_OUTPUT_DIR) -> Optional[str]:
    """
    Download a paper from arXiv by its ID or URL.
    Saves the PDF and a citation file in a folder named after the paper.
    """
    # Extract ID from URL if necessary
    arxiv_id = arxiv_id_or_url.split('/')[-1]
    if arxiv_id.endswith('.pdf'):
        arxiv_id = arxiv_id.replace('.pdf', '')
    
    print(f"Searching for arXiv paper: {arxiv_id}...")
    
    try:
        search = arxiv.Search(id_list=[arxiv_id])
        paper = next(search.results())
    except StopIteration:
        print(f"Error: No paper found with ID {arxiv_id}")
        return None
    except Exception as e:
        print(f"Error searching for paper: {e}")
        return None

    title = paper.title
    folder_name = clean_filename(title)
    target_dir = os.path.join(output_base_dir, folder_name)
    
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)
        print(f"Created directory: {target_dir}")
    else:
        print(f"Directory already exists: {target_dir}")

    # Download PDF
    pdf_filename = f"{folder_name}.pdf"
    pdf_path = os.path.join(target_dir, pdf_filename)
    
    if not os.path.exists(pdf_path):
        print(f"Downloading PDF to {pdf_path}...")
        paper.download_pdf(dirpath=target_dir, filename=pdf_filename)
    else:
        print(f"PDF already exists: {pdf_path}")

    # Generate Citation (BibTeX)
    authors_list = [author.name for author in paper.authors]
    first_author_surname = authors_list[0].split()[-1] if authors_list else "Unknown"
    year = paper.published.year
    bib_key = f"{first_author_surname}{year}{arxiv_id.split('.')[-1]}"
    
    journal = paper.journal_ref if paper.journal_ref else f"arXiv preprint arXiv:{arxiv_id}"
    doi_field = f"  doi={{{paper.doi}}}," if paper.doi else ""
    
    bibtex = f"""@article{{{bib_key},
  title={{{title}}},
  author={{{' and '.join(authors_list)}}},
  journal={{{journal}}},
  year={{{year}}},
  url={{https://arxiv.org/abs/{arxiv_id}}},
{doi_field}
}}"""

    citation_path = os.path.join(target_dir, "citation.bib")
    with open(citation_path, "w", encoding="utf-8") as f:
        f.write(bibtex)
    print(f"Saved citation to {citation_path}")

    # Save summary/metadata
    metadata_path = os.path.join(target_dir, "metadata.txt")
    with open(metadata_path, "w", encoding="utf-8") as f:
        f.write(f"Title: {title}\n")
        f.write(f"Authors: {', '.join(authors_list)}\n")
        f.write(f"Published: {paper.published}\n")
        f.write(f"Updated: {paper.updated}\n")
        f.write(f"ArXiv ID: {arxiv_id}\n")
        f.write(f"URL: https://arxiv.org/abs/{arxiv_id}\n")
        f.write(f"Primary Category: {paper.primary_category}\n")
        f.write(f"Categories: {', '.join(paper.categories)}\n")
        
        if paper.journal_ref:
            f.write(f"Journal Reference: {paper.journal_ref}\n")
            
        if paper.doi:
            f.write(f"DOI: {paper.doi}\n")
            
        if paper.comment:
            f.write(f"Comment: {paper.comment}\n")
            
        f.write("\nAbstract:\n")
        f.write(paper.summary)
    print(f"Saved metadata to {metadata_path}")

    return target_dir

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python arxiv_downloader.py <arxiv_id_or_url> [output_dir]")
        sys.exit(1)
    
    paper_id = sys.argv[1]
    out_dir = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUTPUT_DIR
    
    result = download_arxiv_paper(paper_id, out_dir)
    if result:
        print(f"\nSuccessfully downloaded paper to: {result}")
    else:
        sys.exit(1)
