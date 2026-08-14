## Summer 2026 Product & Technology Internship

# Project Description

The goal of this project was to explore how PBS KIDS could recommend relevant content to users while working within a constraint: the recommendation engine cannot rely on personal user data. Over the summer, my manager and I focused specifically on PBS KIDS games, because the games had metadata that described their characteristics and the number of games is small. We used this information to design an algorithmic approach that uses content metadata to identify meaningful recommendations.

During the project, we researched widely used streaming service recommendation systems (i.e. Netflix and STEAM), analyzed PBS KIDS content needs, and developed a metadata-based approach for recommendation. The algorithm considered what the games were about and how the game is played as well as what age the game was designed for when computing similarity. We used Jaccard similarity, a statistical technique that measures the similarity between two sets, to calculate the similarity between games. We later added Inverse Document Frequency (IDF), a natural language processing technique that gives weight to rare themes and less weight to common themes, to better account for common versus rare theme tags.

In addition to developing the algorithm approach, we conducted surveys and interviews to gather user and stakeholder perspectives on the approach. We also created a prototype user experience to show how the recommendation engine could appear to users and support future product conversations.

# Lessons Learned
A major takeaway from the project was the opportunity to research recommendation engines and learn how similar systems are designed and evaluated. Through my research, I was able to explore systems and apply that learning to the specific needs of PBS KIDS. Companies like Netflix focus on capturing user’s interest through extensive data collection, including viewing history, device types, operation system, content metadata, user interactions including their habits, art personalization, user profile, and more. In contrast, PBS KIDS’ goal is to make recommendations using only Content ID.  

I also learned more about how to communicate ideas, gather feedback from experienced engineers, and adjust my thinking based on that feedback.

Going forward, I want to continue reading research papers and get inspiration for implementation. Many ideas and assumptions I had for the PBS KIDS and Recommendation System came from writings about the Netflix and STEAM Recommendation System. Netflix considers art personalization, visualization based on user interest (i.e. if you are interested in Romance, your recommendations will include images with romantic scenes in the movie or show). My manager and I consider art personalization to keep the recommendations engine fresh and to encourage users to explore games by showing different thumbnails. We did not implement this idea. We considered a possible user experience from the STEAM discovery queue: the idea is to mix content recommendations and unify user interest like videos and games. This would help connect PBS KIDS content across formats and create a more engaging discovery experience for users. This idea was not implemented because the focus was creating the engine, meaning the math and techniques needed to make recommendations, and not the user experience.

 I learned that I should stop waiting too long to ask for clarification or feedback. At times, when I felt uncertain about my work, I hesitated to show it to my manager. At the beginning of the internship, I had to find ways to benchmark the PBS KIDS recommendation engine, I did some research and I understood but did not how to approach benchmarking on content-based recommendation system. I could have communicated that with my manager and got insightful feedback, but I did not feel ready and delayed my understanding of benchmarking a recommendation system.

In the future, I want to share my ideas and get feedback early for work and collaboration because they will help me be a better teammate and coworker.

I learned that I should stop waiting too long to ask for clarification or feedback. At times, when I felt uncertain about my work, I hesitated to show it to my manager. At the beginning of the internship, I had to find ways to benchmark the PBS KIDS recommendation engine, I did some research and I understood but did not how to approach benchmarking on content-based recommendation system. I could have communicated that with my manager and got insightful feedback, but I did not feel ready and delayed my understanding of benchmarking a recommendation system.

In the future, I want to share my ideas and get feedback early for work and collaboration because they will help me be a better teammate and coworker. 

 

# Next Steps
The recommendation approach developed during this project could support several use cases. PBS KIDS could add a CMS module that allows content editors to design pages which include a “Recommended for You” section, incorporate the algorithm as a sorting strategy to personalize collections of games and videos, or provide content curators with a tool that suggests items for collections in the CMS control panel. The system could also become an external service for partners to power smart “Watch Next” selections.

In my opinion, implementing a module in the CMS for pages to include a recommended for you section would be the logical next step. This step would encourage experimentation, meaning it can be scratched off if users are not responding to the changes. There can also be playtesting for parents and kids to get their opinions on the recommendation engine without commitment.

 I believe this project was an amazing project. It encourages exploration and learning for kids while preserving privacy.

 