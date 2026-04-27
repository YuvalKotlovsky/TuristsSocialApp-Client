import { useNavigate } from 'react-router-dom';
import PostForm, { type PostFormValues } from '../components/PostForm';
import { createPost } from '@/services/posts.service';
import { ROUTES } from '@/constants/routes';

export default function Create() {
  const navigate = useNavigate();

  const handleCreate = async (values: PostFormValues) => {
    await createPost({
      content: values.content,
      location: values.location,
      imageFile: values.imageFile,
    });
    navigate(ROUTES.HOME, { replace: true });
  };

  return (
    <PostForm
      mode="create"
      onSubmit={handleCreate}
      onCancel={() => navigate(-1)}
      submitText="Create Post"
    />
  );
}
