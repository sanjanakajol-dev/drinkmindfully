import { router } from 'expo-router';

import { en } from '@/strings/en';
import { Button, Screen, Text } from '@/ui/components';

export default function NotFoundScreen() {
  return (
    <Screen>
      <Text variant="title">{en.notFound.title}</Text>
      <Text muted>{en.notFound.body}</Text>
      <Button label={en.notFound.home} onPress={() => router.replace('/')} />
    </Screen>
  );
}
