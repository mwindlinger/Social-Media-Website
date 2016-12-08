# Link: http://ec2-54-164-126-240.compute-1.amazonaws.com:4567/#!/login
(Note:  Won't work unless I start the server. Contact me if you'd like to see it). 

A social platform for users to post their moments (similar to Facebook posts) in a microblog/social media style.

# Access Control:

  Users can register their own account
  
  Users can login with their own account
  
  Home page is displayed after successful login
  
  Users can logout
  
# Home page:

  Users can publish moments from the home page
  
  Users can upload a picture and a text description as part of their moment
  
  If there is no text description provided, the application will analyze the picture and come up with a description (using Microsoft's        Computer Vision API)
  
  Users will receive a notification whenever a new moment is posted
  
  Recently published moments will be displayed on the home page
  
  Users can comment on moments
  
  Users can visit the detail page of a moment, showing just that individual moment
  
  Users can visit their user profile page
  
# User profile page:

  Users can see all of the moments they posted
  
  Users can delete their own moments
  
  Users can edit the text description of their own moments

# Moment detail page:

  Users can see the picture and the text description associated with the moment
  
  Users can see all the moment's comments

# Voting system:
  
  Users can upvote a moment they like and downvote a moment they dislike
  
  Each moment has a positive/negative score
  
# Emotion system:

  An emotion is asscoiated with each moment
  
  Users can let the application analyze the picture in the moment they published (using Microsoft's Emotion API)
  
  Users can choose to use the analyzed result or to pick an emotion on their own
  
# Search moments by description:

  Users can search moments by their text description
  
  Search moments by picture:
  
  Users can search moments by the content of the pictures
