# Django REST Framework Best Practices

## Serializers

### ModelSerializer Basics

```python
from rest_framework import serializers
from .models import Post, Comment

class PostSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ['id', 'title', 'content', 'author', 'created_at']
        read_only_fields = ['id', 'created_at', 'author']

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
  
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'  


**Rule**: Explicitly list fields. Never use `fields = '__all__'` in production.



class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'content', 'author', 'created_at']

class PostSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    comments = CommentSerializer(many=True, read_only=True)

    class Meta:
        model = Post
        fields = ['id', 'title', 'content', 'author', 'comments', 'created_at']


class PostListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list view."""
    author_name = serializers.CharField(source='author.username', read_only=True)

    class Meta:
        model = Post
        fields = ['id', 'title', 'author_name', 'created_at']

class PostDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer with nested data."""
    author = UserSerializer(read_only=True)
    comments = CommentSerializer(many=True, read_only=True)

    class Meta:
        model = Post
        fields = ['id', 'title', 'content', 'author', 'comments', 'created_at', 'updated_at']


class PostSerializer(serializers.ModelSerializer):
    comment_count = serializers.SerializerMethodField()
    is_author = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = ['id', 'title', 'content', 'comment_count', 'is_author']

    def get_comment_count(self, obj):
        return obj.comments.count()

    def get_is_author(self, obj):
        request = self.context.get('request')
        return request.user == obj.author if request else False

class PostSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ['title', 'content']

    def validate_title(self, value):
        if len(value) < 5:
            raise serializers.ValidationError("Title must be at least 5 characters")
        return value

class PostSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ['title', 'content', 'is_published']

    def validate(self, data):
        if data.get('is_published') and not data.get('content'):
            raise serializers.ValidationError(
                "Cannot publish post without content"
            )
        return data


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm']

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user

class PostSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)
    url = serializers.HyperlinkedIdentityField(view_name='post-detail', read_only=True)

    class Meta:
        model = Post
        fields = ['id', 'title', 'content', 'author_name', 'url']


```python
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend

class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all()
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['author', 'is_published']
    search_fields = ['title', 'content']
    ordering_fields = ['created_at', 'title']
    ordering = ['-created_at']

    def get_serializer_class(self):
        """Use different serializers for list vs detail."""
        if self.action == 'list':
            return PostListSerializer
        return PostDetailSerializer

    def get_queryset(self):
        """Optimize queries based on action."""
        queryset = super().get_queryset()

        if self.action == 'list':
            return queryset.select_related('author').only(
                'id', 'title', 'created_at', 'author__username'
            )
        elif self.action == 'retrieve':
            return queryset.select_related('author').prefetch_related('comments')

        return queryset

    def perform_create(self, serializer):
        """Set author automatically."""
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        post = self.get_object()
        if post.author != request.user:
            return Response({'error': 'Not authorized'}, status=403)

        post.is_published = True
        post.save()
        return Response({'status': 'published'})

    @action(detail=False, methods=['get'])
    def my_posts(self, request):
        """Get posts by current user."""
        posts = self.get_queryset().filter(author=request.user)
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """Only allow GET requests (list and retrieve)."""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class PostStatisticsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        stats = {
            'total_posts': Post.objects.filter(author=user).count(),
            'published_posts': Post.objects.filter(author=user, is_published=True).count(),
            'total_comments': Comment.objects.filter(post__author=user).count(),
        }
        return Response(stats)




from rest_framework.permissions import (
    IsAuthenticated,
    IsAuthenticatedOrReadOnly,
    AllowAny,
    IsAdminUser,
)


class PostViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    


class PostViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]





from rest_framework import permissions

class IsAuthorOrReadOnly(permissions.BasePermission):
    """Only author can edit/delete."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        return obj.author == request.user

class IsStaffOrOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user.is_staff or obj.author == request.user


class PostViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAuthorOrReadOnly]
  


class PostViewSet(viewsets.ModelViewSet):
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        elif self.action == 'create':
            return [IsAuthenticated()]
        else:  # update, partial_update, destroy
            return [IsAuthenticated(), IsAuthorOrReadOnly()]
```

## Authentication

### Token Authentication


# settings.py
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
}

# views.py
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')

    user = authenticate(username=username, password=password)
    if user:
        token, created = Token.objects.get_or_create(user=user)
        return Response({'token': token.key})
    return Response({'error': 'Invalid credentials'}, status=400)
```

## Pagination

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# Custom pagination
from rest_framework.pagination import PageNumberPagination

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class PostViewSet(viewsets.ModelViewSet):
    pagination_class = StandardResultsSetPagination
    ...
```

## Filtering, Searching, Ordering

```bash
pip install django-filter
```

```python
# settings.py
INSTALLED_APPS = [
    ...
    'django_filters',
]

REST_FRAMEWORK = {
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
}

# views.py
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    filterset_fields = ['author', 'category', 'is_published']

    search_fields = ['title', 'content', 'author__username']

  
    ordering_fields = ['created_at', 'title', 'view_count']
    ordering = ['-created_at']  




from django_filters import rest_framework as filters

class PostFilter(filters.FilterSet):
    title = filters.CharFilter(lookup_expr='icontains')
    created_after = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_before = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    min_views = filters.NumberFilter(field_name='view_count', lookup_expr='gte')

    class Meta:
        model = Post
        fields = ['author', 'category', 'is_published']

class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    filterset_class = PostFilter

REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
        'user': '1000/day',
    },
}

from rest_framework.throttling import UserRateThrottle

class BurstRateThrottle(UserRateThrottle):
    scope = 'burst'

class SustainedRateThrottle(UserRateThrottle):
    scope = 'sustained'


REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_RATES': {
        'burst': '10/min',
        'sustained': '100/hour',
    },
}


class PostViewSet(viewsets.ModelViewSet):
    throttle_classes = [BurstRateThrottle, SustainedRateThrottle]
 
## Versioning

```python

REST_FRAMEWORK = {
    'DEFAULT_VERSIONING_CLASS': 'rest_framework.versioning.URLPathVersioning',
    'DEFAULT_VERSION': 'v1',
    'ALLOWED_VERSIONS': ['v1', 'v2'],
}


urlpatterns = [
    path('api/v1/', include('api.urls', namespace='v1')),
    path('api/v2/', include('api.urls', namespace='v2')),
]

# views.py
class PostViewSet(viewsets.ModelViewSet):
    def get_serializer_class(self):
        if self.request.version == 'v2':
            return PostSerializerV2
        return PostSerializer
```

## Error Handling

```python
from rest_framework.views import exception_handler
from rest_framework.response import Response


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        # Customize error response format
        response.data = {
            'error': response.data,
            'status_code': response.status_code,
        }

    return response

# settings.py
REST_FRAMEWORK = {
    'EXCEPTION_HANDLER': 'myapp.exceptions.custom_exception_handler',
}

# Raise custom exceptions
from rest_framework.exceptions import ValidationError, PermissionDenied

def my_view(request):
    if not condition:
        raise ValidationError('Invalid data provided')

    if not has_permission:
        raise PermissionDenied('You do not have permission')
```

## Testing DRF APIs

```python
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

class PostAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client = APIClient()

    def test_list_posts(self):
        """Test retrieving post list."""
        Post.objects.create(title='Test Post', author=self.user)

        response = self.client.get('/api/posts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_create_post_authenticated(self):
        """Test creating post when authenticated."""
        self.client.force_authenticate(user=self.user)

        data = {'title': 'New Post', 'content': 'Test content'}
        response = self.client.post('/api/posts/', data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Post.objects.count(), 1)
        self.assertEqual(Post.objects.first().author, self.user)

    def test_create_post_unauthenticated(self):
        """Test creating post when not authenticated."""
        data = {'title': 'New Post', 'content': 'Test content'}
        response = self.client.post('/api/posts/', data)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_own_post(self):
        """Test updating own post."""
        post = Post.objects.create(title='Original', author=self.user)
        self.client.force_authenticate(user=self.user)

        data = {'title': 'Updated'}
        response = self.client.patch(f'/api/posts/{post.id}/', data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        post.refresh_from_db()
        self.assertEqual(post.title, 'Updated')

    def test_delete_others_post(self):
        """Test cannot delete another user's post."""
        other_user = User.objects.create_user(username='other', password='pass')
        post = Post.objects.create(title='Post', author=other_user)
        self.client.force_authenticate(user=self.user)

        response = self.client.delete(f'/api/posts/{post.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
```

## DRF Best Practices Checklist

 Explicitly define serializer fields (never use `__all__`)
 Use read_only_fields for computed or auto-generated fields
 Create separate serializers for list/detail views
 Use `select_related()` and `prefetch_related()` in ViewSet querysets
 Implement proper permissions (object-level when needed)
 Add authentication to all non-public endpoints
 Implement pagination for list endpoints
 Add filtering, searching, and ordering where appropriate
 Use throttling to prevent API abuse
 Version your API from the start
 Write comprehensive API tests
 Document your API (use drf-spectacular or similar)
 Validate all input data in serializers
 Return appropriate HTTP status codes

---

**Remember**: DRF gives you powerful tools, but you must configure them properly. Security and performance are not automatic - you must implement them deliberately.
